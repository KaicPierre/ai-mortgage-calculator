import { container } from 'tsyringe';

import { GenAiRepository } from '@repositories/GenAiRepository';
import { IGenAiRepository } from '@repositories/interfaces';

container.registerSingleton<IGenAiRepository>('GenAiRepository', GenAiRepository);
