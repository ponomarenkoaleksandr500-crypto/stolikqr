import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  });
  // Uploaded dish photos (see MenuService.setDishPhoto, which writes to this
  // same process.cwd()-relative path) - served back as plain static files,
  // no auth needed to view them (same as any menu image). Deliberately NOT
  // __dirname-relative: outDir mirrors src's full path (dist/src/main.js),
  // so __dirname would resolve one level too deep in a compiled build.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  // Explicit shared adapter for the two WS gateways (StaffGateway/GuestGateway,
  // different namespaces on one server) - without this, Nest can end up
  // tearing down the first namespace's connections when the second gateway
  // initializes.
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
