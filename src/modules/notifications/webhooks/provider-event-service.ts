import type { NormalizedProviderEvent, ProviderEventResult } from './provider-event-types.ts'
import type { ProviderEventRepository } from './provider-event-repository.ts'
export class ProviderEventService { constructor(private readonly repository: ProviderEventRepository) {} process(event: NormalizedProviderEvent): Promise<ProviderEventResult> { return this.repository.process(event) } }
