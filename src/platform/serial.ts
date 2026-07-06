let tail: Promise<void> = Promise.resolve();

export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = tail.then(task, task);
  tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
