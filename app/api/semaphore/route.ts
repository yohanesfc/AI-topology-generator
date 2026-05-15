const SEMAPHORE_URL = process.env.SEMAPHORE_URL!;
const SEMAPHORE_TOKEN = process.env.SEMAPHORE_TOKEN!;

// GET — ambil list templates
export async function GET() {
  const res = await fetch(`${SEMAPHORE_URL}/api/project/1/templates`, {
    headers: { Authorization: `Bearer ${SEMAPHORE_TOKEN}` },
  });
  const templates = await res.json();
  return Response.json(templates);
}

// POST — trigger job
export async function POST(req: Request) {
  const { template_id } = await req.json();

  const res = await fetch(`${SEMAPHORE_URL}/api/project/1/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SEMAPHORE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ template_id, debug: false, dry_run: false }),
  });

  const task = await res.json();
  return Response.json(task);
}
