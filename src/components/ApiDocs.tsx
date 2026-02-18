import { BASE } from '../api';

interface ApiDocsProps {
  onOpenWizard: () => void;
}

const EXAMPLE_PRD = `{
  "prd": {
    "branchName": "feat/my-feature",
    "userStories": [
      {
        "id": "US-001",
        "title": "Setup project",
        "acceptanceCriteria": ["Repo initialised", "CI passing"],
        "priority": 1
      }
    ]
  },
  "config": {
    "goal": "Build a production-ready CLI tool in Rust",
    "model": "claude-opus-4-5",
    "system_prompt": "You are an expert Rust engineer...",
    "generation_pattern": "edit_existing",
    "story_order": ["US-001"]
  }
}`;

export function ApiDocs({ onOpenWizard }: ApiDocsProps) {
  const base = BASE;

  return (
    <div className="api-docs">
      <div className="api-hero">
        <h2 className="api-title">Ralph API</h2>
        <p className="api-subtitle">
          Submit any PRD as JSON — with goal, model, prompt, and story order — and track
          your agent loop progress via REST. Works with Claude, GPT-4, Gemini, or any CLI agent.
        </p>
        <button className="ctrl-btn ctrl-play demo-btn" onClick={onOpenWizard}>
          <span className="ctrl-icon">+</span>
          Create a run
        </button>
      </div>

      <div className="endpoint-list">
        <EndpointCard
          method="POST"
          path="/runs"
          desc="Create a new Ralph run — pass PRD, config (goal, model, system prompt, generation pattern, story order) and optionally your own api_key"
          body={EXAMPLE_PRD}
          response={`{ "run_id": "uuid", "api_key": "your-key", "status": "pending", "config": {...} }`}
          base={base}
        />
        <EndpointCard
          method="GET"
          path="/runs/:id"
          desc="Get full run state including config and all stories in execution order"
          header="x-ralph-key: your-api-key"
          response={`{ "id": "uuid", "status": "running", "config": { "model": "...", "goal": "...", ... }, "stories": [...] }`}
          base={base}
        />
        <EndpointCard
          method="GET"
          path="/runs/:id/next"
          desc="Get the next pending story plus the run config — use this in your agent polling loop"
          header="x-ralph-key: your-api-key"
          response={`{ "complete": false, "config": { "model": "...", "system_prompt": "..." }, "story": { "id": "US-001", ... } }`}
          base={base}
        />
        <EndpointCard
          method="PATCH"
          path="/runs/:id/stories/:storyId"
          desc="Mark a story as passed (or update notes). Run auto-completes when all stories pass."
          header="x-ralph-key: your-api-key"
          body={`{ "passes": true, "notes": "Implemented in src/main.rs" }`}
          response={`{ "ok": true }`}
          base={base}
        />
        <EndpointCard
          method="PATCH"
          path="/runs/:id"
          desc="Update run status or any config field (model, prompt, goal, pattern, story_order)"
          header="x-ralph-key: your-api-key"
          body={`{ "status": "paused", "model": "gpt-4o", "goal": "Updated goal..." }`}
          response={`{ "ok": true }`}
          base={base}
        />
        <EndpointCard
          method="GET"
          path="/models"
          desc="List all supported model identifiers"
          response={`{ "models": ["claude-opus-4-5", "gpt-4o", "gemini-2.0-flash", ...] }`}
          base={base}
        />
      </div>

      <div className="usage-section">
        <h3 className="usage-title">Using with ralph.sh</h3>
        <div className="code-block">
          <pre>{`# 1. Create a run with full config
RESPONSE=$(curl -s -X POST ${base}/runs \\
  -H "Content-Type: application/json" \\
  -d '{
    "prd": { "branchName": "feat/x", "userStories": [...] },
    "config": {
      "goal": "Build a Rust CLI tool",
      "model": "claude-opus-4-5",
      "system_prompt": "You are an expert...",
      "generation_pattern": "edit_existing",
      "story_order": ["US-001","US-002","US-003"]
    }
  }')

RUN_ID=$(echo $RESPONSE | jq -r .run_id)
API_KEY=$(echo $RESPONSE | jq -r .api_key)

# 2. Poll /next — response includes config so agent knows model & prompt
while true; do
  NEXT=$(curl -s ${base}/runs/$RUN_ID/next \\
    -H "x-ralph-key: $API_KEY")

  [ "$(echo $NEXT | jq -r .complete)" = "true" ] && break

  STORY_ID=$(echo $NEXT | jq -r .story.id)
  MODEL=$(echo $NEXT | jq -r .config.model)
  PROMPT=$(echo $NEXT | jq -r .config.system_prompt)

  # run your agent with the model and prompt from the config
  echo "$PROMPT" | $MODEL --dangerously-skip-permissions < prompt.md

  # mark passed
  curl -s -X PATCH ${base}/runs/$RUN_ID/stories/$STORY_ID \\
    -H "x-ralph-key: $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d '{"passes": true}'
done`}</pre>
        </div>
      </div>
    </div>
  );
}

interface EndpointCardProps {
  method: string;
  path: string;
  desc: string;
  body?: string;
  header?: string;
  response: string;
  base: string;
}

function EndpointCard({ method, path, desc, body, header, response, base }: EndpointCardProps) {
  const methodClass = method === 'GET' ? 'method-get' : method === 'POST' ? 'method-post' : 'method-patch';

  return (
    <div className="endpoint-card">
      <div className="endpoint-header">
        <span className={`method-badge ${methodClass}`}>{method}</span>
        <code className="endpoint-path">{base}{path}</code>
      </div>
      <p className="endpoint-desc">{desc}</p>
      <div className="endpoint-details">
        {header && (
          <div className="detail-row">
            <span className="detail-label">Header</span>
            <code className="detail-code">{header}</code>
          </div>
        )}
        {body && (
          <div className="detail-row">
            <span className="detail-label">Body</span>
            <pre className="detail-pre">{body}</pre>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Returns</span>
          <code className="detail-code">{response}</code>
        </div>
      </div>
    </div>
  );
}
