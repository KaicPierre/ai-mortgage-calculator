import { container } from 'tsyringe';

import { IGenAiRepository } from '@repositories/interfaces';
import { GenAiRepository } from '@repositories/GenAiRepository';

container.registerSingleton<IGenAiRepository>('GenAiRepository', GenAiRepository);
