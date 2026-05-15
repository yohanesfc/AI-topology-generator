const SEMAPHORE_URL = process.env.SEMAPHORE_URL!;
const SEMAPHORE_TOKEN = process.env.SEMAPHORE_TOKEN!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('id');
  if (!taskId) return Response.json({ error: 'No task ID' }, { status: 400 });

  const res = await fetch(`${SEMAPHORE_URL}/api/project/1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${SEMAPHORE_TOKEN}` },
  });

  return Response.json(await res.json());
}
