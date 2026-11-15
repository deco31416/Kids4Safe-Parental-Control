import { Global, Module } from '@nestjs/common';
import { PluginModeService } from './plugin-mode.service';

/**
 * 🌐 PLUGIN MODE GLOBAL MODULE
 * 
 * Módulo global que proporciona PluginModeService a toda la aplicación.
 * Se inicializa una sola vez para evitar logging duplicado.
 */
@Global()
@Module({
  providers: [PluginModeService],
  exports: [PluginModeService],
})
export class PluginModeModule {}
