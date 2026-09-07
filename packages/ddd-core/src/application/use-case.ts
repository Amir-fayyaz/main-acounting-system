/**
 * A use case (application service) orchestrates exactly one business
 * operation: load the aggregate through its repository port, call behavior
 * methods on the domain, and persist through the same port. It never imports
 * infrastructure.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput> | TOutput;
}
