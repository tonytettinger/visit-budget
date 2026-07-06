import type {
  ClientPayload,
  ClientRequest,
  ClientResponse,
} from "../shared/messages";

export async function sendRequest<T extends ClientPayload>(
  request: ClientRequest,
): Promise<T> {
  const response: ClientResponse = await chrome.runtime.sendMessage(request);
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.payload as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function requiredElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing UI element: ${selector}`);
  }
  return element;
}
