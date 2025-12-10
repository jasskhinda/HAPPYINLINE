# Pre-Production Deployment Checklist
**Happy Inline - Multi-Industry Booking Platform**

Use this checklist before deploying to production to ensure enterprise-level quality and security.

---

## 🔴 CRITICAL - Must Complete Before Launch

### 1. Security Configuration

- [ ] **Verify Supabase RLS Policies**
  ```bash
  # Run this script to verify RLS policies
  node scripts/verifyRLSPolicies.js
  ```
  - [ ] Profiles table RLS enabled
  - [ ] Shops table RLS enabled
  - [ ] Bookings table RLS enabled
  - [ ] Messages table RLS enabled
  - [ ] Shop_staff table RLS enabled

- [ ] **Remove Console Logging**
  - [ ] Replace all `console.log` with `logger.log` from `/src/utils/logger.js`
  - [ ] Search codebase: `grep -r "console.log" src/` should return 0 results
  - [ ] Keep `console.error` for critical errors only

- [ ] **Environment Variables**
  - [ ] Move Supabase credentials to environment-specific files
  - [ ] Create separate configs for dev/staging/prod
  - [ ] Never commit `.env` files to git

- [ ] **API Keys & Secrets**
  - [ ] Verify no API keys in source code
  - [ ] Verify no passwords in source code
  - [ ] Check git history for accidentally committed secrets

### 2. Database Verification

- [ ] **Column Consistency**
  - [x] ✅ Fixed: `owner_id` → `created_by` (completed)
  - [ ] Verify all foreign keys are correct
  - [ ] Run database migration scripts

- [ ] **Data Integrity**
  - [ ] Test all CRUD operations
  - [ ] Verify cascade deletes work correctly
  - [ ] Check for orphaned records

- [ ] **Indexes**
  - [ ] Verify indexes on frequently queried columns
  - [ ] Add index on `shops.created_by`
  - [ ] Add index on `bookings.shop_id`
  - [ ] Add index on `messages.conversation_id`

### 3. Error Tracking

- [ ] **Setup Error Logging Service**
  - [ ] Install Sentry: `npm install @sentry/react-native`
  - [ ] Configure Sentry DSN
  - [ ] Test error reporting
  - [ ] Setup error alerts

- [ ] **Implement Crash Reporting**
  - [ ] Test crash scenarios
  - [ ] Verify crash logs are captured
  - [ ] Setup crash notifications

---

## 🟡 HIGH PRIORITY - Should Complete Before Launch

### 4. Performance Optimization

- [ ] **Image Compression**
  ```bash
  npm install expo-image-manipulator
  ```
  - [ ] Implement image compression before upload
  - [ ] Set max image dimensions (1024px recommended)
  - [ ] Set compression quality (70% recommended)

- [ ] **Bundle Size**
  - [ ] Run bundle analyzer: `npx expo-doctor`
  - [ ] Remove unused dependencies
  - [ ] Implement code splitting if needed

- [ ] **Query Optimization**
  - [ ] Add pagination to large data sets
  - [ ] Implement data caching where appropriate
  - [ ] Test with 1000+ records

### 5. Network Resilience

- [ ] **Offline Handling**
  - [ ] Install NetInfo: `npm install @react-native-community/netinfo`
  - [ ] Add offline detection
  - [ ] Show offline banner
  - [ ] Cache data for offline viewing

- [ ] **Request Timeout**
  - [ ] Implement request timeout (30s recommended)
  - [ ] Add retry logic for failed requests
  - [ ] Show user-friendly timeout messages

### 6. Authentication Hardening

- [ ] **Password Requirements**
  - [ ] Increase minimum to 8 characters
  - [ ] Add complexity requirements
  - [ ] Show password strength indicator

- [ ] **Account Security**
  - [ ] Implement account lockout (5 failed attempts)
  - [ ] Add "Forgot Password" flow
  - [ ] Add session timeout (24 hours recommended)

---

## 🟢 MEDIUM PRIORITY - Recommended Before Launch

### 7. Analytics

- [ ] **Setup Analytics Service**
  - [ ] Choose service (Firebase, Mixpanel, Amplitude)
  - [ ] Install analytics package
  - [ ] Track key user actions
  - [ ] Setup conversion funnels

- [ ] **Track These Events**
  - [ ] User registration
  - [ ] User login
  - [ ] Booking created
  - [ ] Business created
  - [ ] Subscription selected

### 8. Testing

- [ ] **Manual Testing**
  - [ ] Test all user flows end-to-end
  - [ ] Test on iOS and Android
  - [ ] Test on different screen sizes
  - [ ] Test with slow network (3G simulation)

- [ ] **Test Data Cleanup**
  - [ ] Remove test users
  - [ ] Remove test bookings
  - [ ] Remove test shops
  - [ ] Verify database is clean

### 9. Legal & Compliance

- [ ] **Terms & Privacy**
  - [ ] Create Terms of Service
  - [ ] Create Privacy Policy
  - [ ] Add links in app footer
  - [ ] Add consent checkboxes

- [ ] **GDPR Compliance** (if applicable)
  - [ ] Add data export feature
  - [ ] Add account deletion feature
  - [ ] Add cookie consent

---

## 🔵 LOW PRIORITY - Post-Launch Improvements

### 10. Advanced Features

- [ ] **Two-Factor Authentication**
  - [ ] Add SMS 2FA option
  - [ ] Add authenticator app option

- [ ] **Advanced Analytics**
  - [ ] User behavior tracking
  - [ ] A/B testing framework
  - [ ] Revenue analytics

- [ ] **Performance Monitoring**
  - [ ] Install performance monitoring
  - [ ] Track app load time
  - [ ] Track screen transition time

---

## 📱 App Store Preparation

### iOS App Store

- [ ] **App Store Assets**
  - [ ] App icon (1024x1024)
  - [ ] Screenshots (all required sizes)
  - [ ] App Store description
  - [ ] Keywords
  - [ ] Privacy policy URL

- [ ] **Build Configuration**
  - [ ] Update version number
  - [ ] Update build number
  - [ ] Configure app permissions
  - [ ] Test production build

### Google Play Store

- [ ] **Play Store Assets**
  - [ ] App icon (512x512)
  - [ ] Feature graphic (1024x500)
  - [ ] Screenshots (all required sizes)
  - [ ] Play Store description
  - [ ] Privacy policy URL

- [ ] **Build Configuration**
  - [ ] Update version name
  - [ ] Update version code
  - [ ] Configure app permissions
  - [ ] Generate signed AAB

---

## 🚀 Deployment Steps

### Pre-Deployment

1. **Code Review**
   ```bash
   # Run final code quality check
   npm run lint
   npm run type-check  # if using TypeScript
   ```

2. **Version Bump**
   ```json
   // app.json
   {
     "expo": {
       "version": "1.0.0",  // Update this
       "android": {
         "versionCode": 1   // Update this
       },
       "ios": {
         "buildNumber": "1" // Update this
       }
     }
   }
   ```

3. **Build Production Bundle**
   ```bash
   # Build for iOS
   eas build --platform ios --profile production

   # Build for Android
   eas build --platform android --profile production
   ```

### Post-Deployment

4. **Monitor Errors**
   - Check Sentry for errors
   - Monitor crash reports
   - Watch app store reviews

5. **Performance Baseline**
   - Record initial load time
   - Record average screen transition time
   - Record API response times

6. **User Feedback**
   - Monitor support requests
   - Read app store reviews
   - Collect user feedback

---

## 📊 Success Metrics

Track these metrics after launch:

- **User Acquisition**
  - Daily active users (DAU)
  - Monthly active users (MAU)
  - New registrations per day

- **Engagement**
  - Average session duration
  - Screens per session
  - Return rate (1-day, 7-day, 30-day)

- **Bookings**
  - Bookings created per day
  - Booking completion rate
  - Average booking value

- **Technical**
  - App crash rate (target: <0.1%)
  - API error rate (target: <1%)
  - Average load time (target: <2s)

---

## 🆘 Rollback Plan

If critical issues are found after deployment:

1. **Immediate Actions**
   - [ ] Disable new user registrations (if auth issue)
   - [ ] Enable maintenance mode banner
   - [ ] Communicate with users via push notification

2. **Rollback Process**
   - [ ] Revert to previous app version in stores
   - [ ] Restore database backup if needed
   - [ ] Verify rollback success

3. **Post-Rollback**
   - [ ] Identify root cause
   - [ ] Create fix
   - [ ] Test fix thoroughly
   - [ ] Deploy fix with version bump

---

## 📝 Deployment Checklist Sign-Off

- [ ] **Development Team Lead** - Code quality verified
- [ ] **QA Lead** - All tests passed
- [ ] **Security Lead** - Security review completed
- [ ] **Product Manager** - Features verified
- [ ] **CTO/Tech Lead** - Deployment approved

**Deployment Date:** _______________

**Deployed By:** _______________

**Deployment Notes:**
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

## 🎉 Post-Launch Celebration!

Once all critical and high-priority items are complete:

1. Deploy to production
2. Monitor for 24 hours
3. Celebrate with the team! 🎊

**Remember:** A smooth launch is better than a fast launch. Take the time to complete this checklist thoroughly.
