# 💈 Barber Booking App

React Native barber booking app with Supabase.

## 🚀 Quick Start

```bash
npm install
npx expo start
```

## ⚙️ Supabase Setup

### Quick Setup (3 Steps)

1. **Enable OTP Authentication**
   - Dashboard → Authentication → Email → Enable OTP ✅

2. **Run Database Setup**
   - SQL Editor → Copy `DATABASE_SETUP.sql` → Run ✅
   - Make yourself admin: `UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';`

3. **Create Storage Bucket**
   - Storage → New bucket: `service-icons` → Public ✅

**📖 Full Guide:** See `SETUP_GUIDE.md` for complete instructions

Done! ✅

## 🔧 Environment Variables

Create `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## 📱 User Flow

```
Onboarding → Login/Signup → Email OTP → Name → MainScreen
```

## 🎯 Features

- Email authentication with OTP
- Book barber appointments
- Real-time chat
- Reviews & ratings
- Profile management
- Multi-role support (Customer/Barber/Manager/Admin)

## 🛠️ Tech Stack

- React Native + Expo
- Supabase (Auth, Database, Real-time)
- React Navigation
- AsyncStorage

---

**Author:** [@js-bhavyansh](https://github.com/js-bhavyansh)
