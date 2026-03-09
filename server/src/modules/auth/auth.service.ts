import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../../common/services/email.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  SendOtpDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate tokens
  private async generateTokens(userId: string, email?: string, phone?: string) {
    const payload = { sub: userId, email, phone };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const { name, email, phone, password, confirmPassword } = dto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (!email && !phone) {
      throw new BadRequestException('Email or phone number is required');
    }

    // Check existing user
    const existingQuery: any[] = [];
    if (email) existingQuery.push({ email });
    if (phone) existingQuery.push({ phone });

    const existingUser = await this.userModel.findOne({ $or: existingQuery });
    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP
    const otp = this.generateOTP();
    const otpExpiresAt = new Date(
      Date.now() + this.configService.get<number>('OTP_EXPIRATION_MINUTES', 5) * 60 * 1000,
    );

    // Create user
    const user = await this.userModel.create({
      name,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpiresAt,
      displayName: name,
    });

    // Send OTP
    if (email) {
      await this.emailService.sendOTP(email, otp, name);
    }

    // In dev, log OTP
    if (this.configService.get('NODE_ENV') === 'development') {
      console.log(`[DEV] OTP for ${email || phone}: ${otp}`);
    }

    return {
      message: 'Registration successful. Please verify with the OTP sent.',
      userId: user._id,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { email, phone, otp } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const query: any = {};
    if (email) query.email = email;
    if (phone) query.phone = phone;

    const user = await this.userModel.findOne(query).select('+otp +otpExpiresAt');
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.otp || user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Mark as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.phone,
    );

    // Send welcome email
    if (user.email) {
      await this.emailService.sendWelcomeEmail(user.email, user.name);
    }

    return {
      message: 'Email verified successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const { email, phone, password } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const query: any = {};
    if (email) query.email = email;
    if (phone) query.phone = phone;

    const user = await this.userModel.findOne(query).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isDeleted) {
      throw new UnauthorizedException('Account has been deleted');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      // Send new OTP for verification
      const otp = this.generateOTP();
      const otpExpiresAt = new Date(
        Date.now() + this.configService.get<number>('OTP_EXPIRATION_MINUTES', 5) * 60 * 1000,
      );
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();

      if (email) {
        await this.emailService.sendOTP(email, otp, user.name);
      }

      return {
        message: 'Account not verified. A new OTP has been sent.',
        requiresVerification: true,
      };
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.phone,
    );

    return {
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        bio: user.bio,
      },
      ...tokens,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const { email, phone } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const query: any = {};
    if (email) query.email = email;
    if (phone) query.phone = phone;

    const user = await this.userModel.findOne(query);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otp = this.generateOTP();
    const otpExpiresAt = new Date(
      Date.now() + this.configService.get<number>('OTP_EXPIRATION_MINUTES', 5) * 60 * 1000,
    );

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    if (email) {
      await this.emailService.sendOTP(email, otp, user.name);
    }

    if (this.configService.get('NODE_ENV') === 'development') {
      console.log(`[DEV] OTP for ${email || phone}: ${otp}`);
    }

    return { message: 'OTP sent successfully' };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const { refreshToken } = dto;

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub).select('+refreshToken');
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user._id.toString(), user.email, user.phone);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, phone, otp, newPassword } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const query: any = {};
    if (email) query.email = email;
    if (phone) query.phone = phone;

    const user = await this.userModel.findOne(query).select('+otp +otpExpiresAt');
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.otp || user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
      status: 'offline',
      lastSeen: new Date(),
    });
    return { message: 'Logged out successfully' };
  }
}
