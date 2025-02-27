import { AuthorizationService } from 'src/modules/auth/services/authorization.service';

export abstract class BasePolicy {
  constructor(protected readonly authorizationService: AuthorizationService) {}
}
