import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-ralph-key",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

const ALLOWED_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-opus-4",
  "claude-sonnet-4",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "o1",
  "o1-mini",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

const ALLOWED_PATTERNS = ["edit_existing", "generate_new"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/ralph-api\/?/, "").split("/").filter(Boolean);
    const method = req.method;
    const ralphKey = req.headers.get("x-ralph-key") ?? "";

    // ── POST /runs ──────────────────────────────────────────────────────────
    if (method === "POST" && parts[0] === "runs" && parts.length === 1) {
      const body = await req.json();
      const { prd, api_key, config } = body as {
        prd: {
          branchName: string;
          userStories: Array<{
            id: string;
            title: string;
            acceptanceCriteria: string[];
            priority: number;
            passes?: boolean;
            notes?: string;
          }>;
        };
        api_key?: string;
        config?: {
          system_prompt?: string;
          model?: string;
          goal?: string;
          generation_pattern?: string;
          story_order?: string[];
        };
      };

      if (!prd?.branchName || !Array.isArray(prd?.userStories)) {
        return err("prd.branchName and prd.userStories are required");
      }

      const model = config?.model ?? "claude-opus-4-5";
      if (!ALLOWED_MODELS.includes(model)) {
        return err(`model must be one of: ${ALLOWED_MODELS.join(", ")}`);
      }

      const pattern = config?.generation_pattern ?? "edit_existing";
      if (!ALLOWED_PATTERNS.includes(pattern)) {
        return err(`generation_pattern must be one of: ${ALLOWED_PATTERNS.join(", ")}`);
      }

      const key = api_key || crypto.randomUUID();

      const { data: run, error: runErr } = await supabase
        .from("ralph_runs")
        .insert({
          branch_name: prd.branchName,
          status: "pending",
          api_key: key,
          system_prompt: config?.system_prompt ?? "",
          model,
          goal: config?.goal ?? "",
          generation_pattern: pattern,
          story_order: config?.story_order ?? [],
        })
        .select()
        .single();

      if (runErr) return err(runErr.message, 500);

      const stories = prd.userStories.map(s => ({
        run_id: run.id,
        story_id: s.id,
        title: s.title,
        acceptance_criteria: s.acceptanceCriteria,
        priority: s.priority,
        passes: s.passes ?? false,
        notes: s.notes ?? "",
      }));

      const { error: storiesErr } = await supabase.from("ralph_stories").insert(stories);
      if (storiesErr) return err(storiesErr.message, 500);

      return json({ run_id: run.id, api_key: key, status: run.status, config: { model, generation_pattern: pattern, goal: config?.goal ?? "", system_prompt: config?.system_prompt ?? "", story_order: config?.story_order ?? [] } }, 201);
    }

    // ── GET /runs/:id ────────────────────────────────────────────────────────
    if (method === "GET" && parts[0] === "runs" && parts.length === 2) {
      const runId = parts[1];

      const { data: run, error: runErr } = await supabase
        .from("ralph_runs")
        .select("*")
        .eq("id", runId)
        .eq("api_key", ralphKey)
        .maybeSingle();

      if (runErr) return err(runErr.message, 500);
      if (!run) return err("Run not found or invalid api_key", 404);

      let storiesQuery = supabase
        .from("ralph_stories")
        .select("*")
        .eq("run_id", runId);

      const storyOrder: string[] = run.story_order ?? [];
      if (storyOrder.length > 0) {
        storiesQuery = storiesQuery.order("story_id");
      } else {
        storiesQuery = storiesQuery.order("priority", { ascending: true });
      }

      const { data: rawStories, error: stErr } = await storiesQuery;
      if (stErr) return err(stErr.message, 500);

      let stories = rawStories ?? [];
      if (storyOrder.length > 0) {
        stories = stories.sort((a, b) => {
          const ai = storyOrder.indexOf(a.story_id);
          const bi = storyOrder.indexOf(b.story_id);
          return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
        });
      }

      return json({
        id: run.id,
        branch_name: run.branch_name,
        status: run.status,
        created_at: run.created_at,
        updated_at: run.updated_at,
        config: {
          system_prompt: run.system_prompt,
          model: run.model,
          goal: run.goal,
          generation_pattern: run.generation_pattern,
          story_order: run.story_order,
        },
        stories: stories.map(s => ({
          id: s.story_id,
          title: s.title,
          acceptanceCriteria: s.acceptance_criteria,
          priority: s.priority,
          passes: s.passes,
          notes: s.notes,
        })),
      });
    }

    // ── GET /runs/:id/next ───────────────────────────────────────────────────
    if (method === "GET" && parts[0] === "runs" && parts[2] === "next") {
      const runId = parts[1];

      const { data: run } = await supabase
        .from("ralph_runs")
        .select("*")
        .eq("id", runId)
        .eq("api_key", ralphKey)
        .maybeSingle();

      if (!run) return err("Run not found or invalid api_key", 404);

      const storyOrder: string[] = run.story_order ?? [];
      let story = null;

      if (storyOrder.length > 0) {
        const { data: allStories } = await supabase
          .from("ralph_stories")
          .select("*")
          .eq("run_id", runId)
          .eq("passes", false);

        const pending = (allStories ?? []).sort((a, b) => {
          const ai = storyOrder.indexOf(a.story_id);
          const bi = storyOrder.indexOf(b.story_id);
          return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
        });
        story = pending[0] ?? null;
      } else {
        const { data, error: stErr } = await supabase
          .from("ralph_stories")
          .select("*")
          .eq("run_id", runId)
          .eq("passes", false)
          .order("priority", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (stErr) return err(stErr.message, 500);
        story = data;
      }

      if (!story) return json({ complete: true });

      return json({
        complete: false,
        config: {
          system_prompt: run.system_prompt,
          model: run.model,
          goal: run.goal,
          generation_pattern: run.generation_pattern,
        },
        story: {
          id: story.story_id,
          title: story.title,
          acceptanceCriteria: story.acceptance_criteria,
          priority: story.priority,
          passes: story.passes,
          notes: story.notes,
        },
      });
    }

    // ── PATCH /runs/:id ──────────────────────────────────────────────────────
    if (method === "PATCH" && parts[0] === "runs" && parts.length === 2) {
      const runId = parts[1];
      const body = await req.json() as {
        status?: string;
        system_prompt?: string;
        model?: string;
        goal?: string;
        generation_pattern?: string;
        story_order?: string[];
      };

      const { data: run } = await supabase
        .from("ralph_runs")
        .select("id")
        .eq("id", runId)
        .eq("api_key", ralphKey)
        .maybeSingle();

      if (!run) return err("Run not found or invalid api_key", 404);

      const allowed = ["pending", "running", "paused", "complete", "failed"];
      if (body.status && !allowed.includes(body.status)) {
        return err(`status must be one of: ${allowed.join(", ")}`);
      }
      if (body.model && !ALLOWED_MODELS.includes(body.model)) {
        return err(`model must be one of: ${ALLOWED_MODELS.join(", ")}`);
      }
      if (body.generation_pattern && !ALLOWED_PATTERNS.includes(body.generation_pattern)) {
        return err(`generation_pattern must be one of: ${ALLOWED_PATTERNS.join(", ")}`);
      }

      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.status) update.status = body.status;
      if (body.system_prompt !== undefined) update.system_prompt = body.system_prompt;
      if (body.model) update.model = body.model;
      if (body.goal !== undefined) update.goal = body.goal;
      if (body.generation_pattern) update.generation_pattern = body.generation_pattern;
      if (body.story_order) update.story_order = body.story_order;

      const { error: upErr } = await supabase.from("ralph_runs").update(update).eq("id", runId);
      if (upErr) return err(upErr.message, 500);
      return json({ ok: true });
    }

    // ── PATCH /runs/:id/stories/:storyId ────────────────────────────────────
    if (method === "PATCH" && parts[0] === "runs" && parts[2] === "stories" && parts.length === 4) {
      const runId = parts[1];
      const storyId = parts[3];
      const body = await req.json() as { passes?: boolean; notes?: string };

      const { data: run } = await supabase
        .from("ralph_runs")
        .select("id")
        .eq("id", runId)
        .eq("api_key", ralphKey)
        .maybeSingle();

      if (!run) return err("Run not found or invalid api_key", 404);

      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.passes === "boolean") update.passes = body.passes;
      if (typeof body.notes === "string") update.notes = body.notes;

      const { error: upErr } = await supabase
        .from("ralph_stories")
        .update(update)
        .eq("run_id", runId)
        .eq("story_id", storyId);

      if (upErr) return err(upErr.message, 500);

      const { data: pending } = await supabase
        .from("ralph_stories")
        .select("id")
        .eq("run_id", runId)
        .eq("passes", false)
        .limit(1);

      if (pending?.length === 0) {
        await supabase
          .from("ralph_runs")
          .update({ status: "complete", updated_at: new Date().toISOString() })
          .eq("id", runId);
      }

      return json({ ok: true });
    }

    // ── GET /models ──────────────────────────────────────────────────────────
    if (method === "GET" && parts[0] === "models") {
      return json({ models: ALLOWED_MODELS });
    }

    return err("Not found", 404);
  } catch (e) {
    return err((e as Error).message, 500);
  }
});
