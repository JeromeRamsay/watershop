import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { User, UserSchema } from "./entities/user.entity";
import { JwtModule } from "@nestjs/jwt";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RealtimeModule,
    // JWT secret must be set via JWT_SECRET environment variable in production.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || "dev-fallback-secret-change-before-deploy",
        signOptions: { expiresIn: "1d" },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
