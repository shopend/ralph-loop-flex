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
    // routes:
    //   POST   /ralph-api/runs              → create run
    //   GET    /ralph-api/runs/:id          → get run + stories
    //   PATCH  /ralph-api/runs/:id          → update run status
    //   PATCH  /ralph-api/runs/:id/stories/:storyId  → mark story passes/notes
    //   GET    /ralph-api/runs/:id/next     → get next pending story

    const method = req.method;
    const ralphKey = req.headers.get("x-ralph-key") ?? "";

    // ── POST /runs ──────────────────────────────────────────────────────────
    if (method === "POST" && parts[0] === "runs" && parts.length === 1) {
      const body = await req.json();
      const { prd, api_key } = body as {
        prd: { branchName: string; userStories: Array<{ id: string; title: string; acceptanceCriteria: string[]; priority: number; passes?: boolean; notes?: string }> };
        api_key?: string;
      };

      if (!prd?.branchName || !Array.isArray(prd?.userStories)) {
        return err("prd.branchName and prd.userStories are required");
      }

      const key = api_key || crypto.randomUUID();

      const { data: run, error: runErr } = await supabase
        .from("ralph_runs")
        .insert({ branch_name: prd.branchName, status: "pending", api_key: key })
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

      return json({ run_id: run.id, api_key: key, status: run.status }, 201);
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

      const { data: stories, error: stErr } = await supabase
        .from("ralph_stories")
        .select("*")
        .eq("run_id", runId)
        .order("priority", { ascending: true });

      if (stErr) return err(stErr.message, 500);

      return json({
        id: run.id,
        branch_name: run.branch_name,
        status: run.status,
        created_at: run.created_at,
        updated_at: run.updated_at,
        stories: stories?.map(s => ({
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
        .select("id")
        .eq("id", runId)
        .eq("api_key", ralphKey)
        .maybeSingle();

      if (!run) return err("Run not found or invalid api_key", 404);

      const { data: story, error: stErr } = await supabase
        .from("ralph_stories")
        .select("*")
        .eq("run_id", runId)
        .eq("passes", false)
        .order("priority", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (stErr) return err(stErr.message, 500);
      if (!story) return json({ complete: true });

      return json({
        complete: false,
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
      const body = await req.json() as { status?: string };

      const allowed = ["pending", "running", "paused", "complete", "failed"];
      if (body.status && !allowed.includes(body.status)) {
        return err(`status must be one of: ${allowed.join(", ")}`);
      }

      const { data: run } = await supabase
        .from("ralph_runs")
        .select("id")
        .eq("id", runId)
        .eq("api_key", ralphKey)
        .maybeSingle();

      if (!run) return err("Run not found or invalid api_key", 404);

      const { error: upErr } = await supabase
        .from("ralph_runs")
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq("id", runId);

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

      // auto-complete run if all stories pass
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

    return err("Not found", 404);
  } catch (e) {
    return err((e as Error).message, 500);
  }
});
