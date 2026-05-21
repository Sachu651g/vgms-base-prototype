"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    var _a;
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({ origin: 'http://localhost:3000' });
    const port = (_a = process.env.NEST_PORT) !== null && _a !== void 0 ? _a : 4000;
    await app.listen(port);
    console.log(`\n🚀 VGMS NestJS backend running at http://localhost:${port}/api`);
    console.log(`   Users  → http://localhost:${port}/api/users`);
    console.log(`   Health → http://localhost:${port}/api/health\n`);
}
bootstrap();
//# sourceMappingURL=main.js.map