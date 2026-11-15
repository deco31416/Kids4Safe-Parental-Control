import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as path from 'path';

@Injectable()
export class PdfTemplateRenderer {
  async render(data: Record<string, unknown>): Promise<string> {
    const templatePath = path.join(
      __dirname,
      'templates',
      'session-report.hbs',
    );
    const source = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(source)(data);
  }
}
