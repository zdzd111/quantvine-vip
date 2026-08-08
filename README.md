# Quantvine Arabic Hub

Build a production-ready, mobile-first web application that completely replicates the UI, color scheme (Dark background #121212 with Gold/Amber accents), and business logic shown in the attached 5 screenshots for the "Quantvine" quantitative trading platform.

Primary UI Language:

- The entire user interface, labels, buttons, and notifications must be in Arabic, exactly as structured in the screenshots.

Bottom Navigation Bar (5 Main Tabs):

1. الصفحة الأمامية (Home)

2. فريقي (Team / Referrals)

3. تحديد الكمية (Quantification Trading)

4. المحفظة المالية (Financial Wallet)

5. ملكي (Profile / Account Settings)

---

DETAILED FEATURE SPECIFICATIONS:

1. الصفحة الأمامية (Home Page) [Ref: Image 5]:

- Top Header: Quantvine logo with notification bell icon.

- Top Action Grid:

  * "ادعو أصدقاء" (Invite Friends): Opens referral link & QR code page.

  * "تعاون وكيل" (Agency Cooperation): Displays commission tier rules.

  * "ينسحب" (Withdraw): Navigates directly to the withdrawal page.

  * "تعبئة رصيد" (Deposit/Recharge): Navigates to the deposit page.

- Crypto Market Live Feed Table: Displays real-time or realistic simulated price rows for BTC/USDT, ETH/USDT, LTC/USDT, DOT/USDT, LINK/USDT, ADA/USDT with green/red percentage indicators.

2. تحديد الكمية (Quantification Page & Core Engine) [Ref: Images 1, 2, 3]:

- Real-time Balance Header showing:

  * إجمالي الإيرادات (Total Revenue in USDT)

  * أرباح اليوم (Today's Earnings in USDT)

  * الأصول المتاحة (Available Wallet Balance in USDT)

- Interactive Core Button: "تقدير بداية واحدة (0/5)"

  * When clicked, trigger a simulated 3-second trading visual/progress animation.

  * After completion, randomly calculate and credit daily profit percentage into "أرباح اليوم" and update "الأصول المتاحة".

  * Increment daily click counter (e.g., 1/5 -> 5/5).

  * If 5/5 is reached, disable button and show toast message: "تم استنفاذ عدد مرات التكميم اليومية، يُرجى العودة غداً بعد الساعة 11:00 AM".

- Interactive VIP Level Slider & Rules:

  * VIP1: 5 daily tasks | Profit Rate: 1.80% - 2.10% | Balance Requirement: 35 ~ 500 USDT

  * VIP2: 6 daily tasks | Profit Rate: 2.30% - 2.60% | Balance Requirement: 300 ~ 2000 USDT

  * VIP3: 7 daily tasks | Profit Rate: 2.80% - 3.10% | Balance Requirement: 1000 ~ 5000 USDT

- Live Success Feed: Scrolling list showing simulated real-time user earnings (e.g., User: bk***s | Earning: 221.33 USDT | State: تحديد النجاح).

3. فريقي (Team & Multi-Level Referral System):

- Unique referral link & invite code generator for each user.

- 3-Tier Commission Structure:

  * Level 1 (Level1 المرؤوس): Direct referrals statistics and commission earnings.

  * Level 2 (Level2 المرؤوس): Secondary level team stats.

  * Level 3 (Level3 المرؤوس): Tertiary team stats.

- Automated team commission calculation when downline members make deposits and run daily quantification trades.

4. السحب والإيداع (Deposit & Withdrawal System):

- "تعبئة رصيد" (Recharge Page):

  * Set the default deposit USDT TRC-20 wallet address permanently to: TVm2QmKP95GKM9NndgqWkRkTJR8ZVks7K9

  * Automatically generate and display a QR code for this specific wallet address on the deposit page.

  * Include a "Copy Address" button next to it.

  * Input field for deposited USDT amount.

  * Image File Uploader to attach deposit proof screenshot.

  * Submitting creates a "Pending Deposit" transaction in the admin panel.

- "ينسحب" (Withdrawal Page):

  * Input field for user's destination USDT (TRC-20) wallet address.

  * Amount input field with automated balance validation (cannot exceed "الأصول المتاحة").

  * Submitting deducts funds immediately and creates a "Pending Withdrawal" transaction.

5. ملكي (Profile Page) [Ref: Image 4]:

- Top User Card: Displays Username (Hi, Mastafa_2004), User ID (ID: 19973217), and VIP Status Badge (VIP1).

- Total Financial Card: Displays Total Balance, Total Revenues, Yesterday's Earnings, Today's Earnings, and Today's Commission.

- Action Buttons: "تعبئة رصيد", "ينسحب", "تفاصيل" (Transaction History).

- Quick Links List: مركز المهام, مشكلة شائعة, مركز الأمن, دروس تكميم, اعدادات اللغة, معلومات عنا, تحميل التطبيق.

6. لوحة تحكم الأدمن الشاملة (/admin) (Backend Logic):

- Connect Supabase for secure authentication, database tables (Users, Transactions, Referral_Trees, VIP_Levels).

- Deposit Request Manager: Review submitted payment screenshots, enter actual received amount, click "Approve" to auto-credit user balance or "Reject".

- Withdrawal Request Manager: View user destination wallets and amounts, click "Approve" or "Reject".

- User Management: View user list, balance adjustments, edit VIP levels, and edit global daily profit percentages.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://quantvine-vip.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/72c4ef1b-b436-4e09-ac1a-15827e6726d9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
