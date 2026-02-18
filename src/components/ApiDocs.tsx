import { BASE } from '../api';

interface ApiDocsProps {
  onCreateDemo: () => void;
  creating: boolean;
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
  }
}`;

export function ApiDocs({ onCreateDemo, creating }: ApiDocsProps) {
  const base = BASE;

  return (
    <div className="api-docs">
      <div className="api-hero">
        <h2 className="api-title">Ralph API</h2>
        <p className="api-subtitle">
          Submit any PRD as JSON and track your agent loop progress via REST.
          Works with Claude, GPT-4, or any CLI agent.
        </p>
        <button className="ctrl-btn ctrl-play demo-btn" onClick={onCreateDemo} disabled={creating}>
          <span className="ctrl-icon">▶</span>
          {creating ? 'Creating...' : 'Try live demo run'}
        </button>
      </div>

      <div className="endpoint-list">
        <EndpointCard
          method="POST"
          path="/runs"
          desc="Create a new Ralph run from a PRD"
          body={EXAMPLE_PRD}
          response={`{ "run_id": "uuid", "api_key": "your-key", "status": "pending" }`}
          base={base}
        />
        <EndpointCard
          method="GET"
          path="/runs/:id"
          desc="Get full run state and all stories"
          header="x-ralph-key: your-api-key"
          response={`{ "id": "uuid", "status": "running", "stories": [...] }`}
          base={base}
        />
        <EndpointCard
          method="GET"
          path="/runs/:id/next"
          desc="Get the next pending story (for agent polling)"
          header="x-ralph-key: your-api-key"
          response={`{ "complete": false, "story": { "id": "US-001", ... } }`}
          base={base}
        />
        <EndpointCard
          method="PATCH"
          path="/runs/:id/stories/:storyId"
          desc="Mark a story as passed (or update notes)"
          header="x-ralph-key: your-api-key"
          body={`{ "passes": true, "notes": "Implemented in src/main.rs" }`}
          response={`{ "ok": true }`}
          base={base}
        />
        <EndpointCard
          method="PATCH"
          path="/runs/:id"
          desc="Update run status (running | paused | complete | failed)"
          header="x-ralph-key: your-api-key"
          body={`{ "status": "paused" }`}
          response={`{ "ok": true }`}
          base={base}
        />
      </div>

      <div className="usage-section">
        <h3 className="usage-title">Using with ralph.sh</h3>
        <div className="code-block">
          <pre>{`# 1. Create a run and save the key
RESPONSE=$(curl -s -X POST ${base}/runs \\
  -H "Content-Type: application/json" \\
  -d @ralph-loop/prd.json)

RUN_ID=$(echo $RESPONSE | jq -r .run_id)
API_KEY=$(echo $RESPONSE | jq -r .api_key)

# 2. Poll /next, run your agent, then mark story passed
while true; do
  NEXT=$(curl -s ${base}/runs/$RUN_ID/next \\
    -H "x-ralph-key: $API_KEY")

  [ "$(echo $NEXT | jq -r .complete)" = "true" ] && break

  STORY_ID=$(echo $NEXT | jq -r .story.id)

  # run your agent here...
  claude --dangerously-skip-permissions < prompt.md

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
