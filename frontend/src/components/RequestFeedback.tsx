import { FormMessage } from './FormMessage';

type RequestFeedbackProps = {
  pendingMessage?: string;
  errorMessage?: string | null;
  infoMessage?: string | null;
  successMessage?: string | null;
};

export function RequestFeedback(props: RequestFeedbackProps) {
  if (props.errorMessage) return <FormMessage message={props.errorMessage} tone="error" />;
  if (props.successMessage) return <FormMessage message={props.successMessage} tone="success" />;
  if (props.infoMessage) return <FormMessage message={props.infoMessage} tone="info" />;
  if (props.pendingMessage) return <FormMessage message={props.pendingMessage} tone="info" />;

  return null;
}
