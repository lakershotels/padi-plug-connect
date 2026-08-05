# PadiPlug Marketplace

Lovable Build Prompt – PadiPlug

Build a production-ready African Marketplace Platform called PadiPlug for Web (React) and Mobile (Flutter) using Supabase (Authentication, PostgreSQL Database, Storage, Realtime, Edge Functions).

Vision

PadiPlug is a trusted African marketplace where people can buy products, book verified artisans, hire service providers, and discover local businesses safely through a secure wallet and escrow payment system. The platform should feel modern, community-driven, mobile-first, and proudly African.

User Roles

Customer

Vendor (Product Seller)

Artisan/Service Provider

Logistics Partner

Admin

Super Admin

Core Features

Secure Email & Phone OTP authentication

Customer wallet

Escrow payment system

Vendor marketplace

Artisan booking marketplace

Product catalog

Shopping cart & checkout

Booking calendar

Order & booking tracking

Live notifications

In-app chat

Ratings & reviews

Wishlist/Favorites

Referral & rewards

Subscription plans (Basic, Premium, Featured)

Deals & Discounts

Push notifications

Admin dashboard

Analytics & reporting

Marketplace

Allow vendors to create stores, upload products, manage inventory, receive orders, and withdraw earnings after customer confirmation.

Allow artisans to create professional profiles with portfolio, pricing, availability, booking schedules, verification badges, and receive bookings securely.

Wallet & Escrow Workflow

Customer funds wallet.

Customer pays for product or service.

Payment is held in escrow.

Vendor or artisan receives notification.

Product is delivered or service completed.

Customer confirms completion.

Escrow automatically releases payment.

Platform deducts commission.

Vendor or artisan wallet is credited.

If a dispute is raised, payment remains frozen until admin resolves the case.

Include wallet balance, pending balance, escrow balance, withdrawals, refunds, transaction history, commissions, and payout records.

Customer Confirmation Button

Every completed order or service must include:

Order Received

Service Completed

Done

When tapped:

Mark order as completed.

Notify admin instantly.

Release escrow payment automatically.

Credit vendor/artisan wallet.

Request customer rating and review.

If customer selects:

Report Issue

Raise Dispute

Then:

Keep payment in escrow.

Notify admin immediately.

Allow evidence upload.

Admin decides refund or payment release after investigation.

Security & Verification

Phone verification

Email verification

Government ID verification

Selfie verification

Business verification

Bank verification

Verified badges

Trust badges

Customer verification

Emergency contacts

Optional live location sharing

Fraud reporting system

Homepage

Search

Vendor Marketplace

Artisan Services

Deals & Discounts

Featured Vendors

Featured Artisans

African Market Picks

Student Hustle

Women in Business

Made in Africa

Recently Added

Nearby Services

Premium Listings

Vendor of the Week

Artisan Spotlight

Search & Filters

Search by product, service, category, location, distance, price, rating, availability, verified status, popularity, newest, and discounts.

Logistics

Registered logistics partners can accept delivery requests, provide live tracking, update delivery status, and receive payment after delivery confirmation.

Admin Dashboard

Manage users, vendors, artisans, products, services, orders, bookings, wallets, escrow, disputes, refunds, subscriptions, advertisements, notifications, categories, reports, analytics, commissions, and fraud prevention.

Monetization

Vendor registration fees

Artisan registration fees

Premium subscriptions

Featured listings

Sponsored adverts

Sales commissions

Booking commissions

Delivery commissions

Promotional placements

UI/UX

Create a premium African-inspired interface with green, orange, gold, white, and charcoal colors. Use modern cards, rounded corners, smooth animations, dark/light mode, responsive layouts, accessibility support, and a trust-first design.

Technical Stack

React (Web)

Flutter (Android & iOS)

Supabase Auth

PostgreSQL

Supabase Storage

Edge Functions

Realtime

REST APIs

Role-Based Access Control (RBAC)

Offline support

Secure file uploads

Production-ready architecture

Goal

Build the most trusted African marketplace where customers safely buy products, book verified artisans, use escrow payments, confirm delivery using the Done / Order Received / Service Completed button before funds are released, and support local businesses through a secure, scalable platform ready for deployment on Android, iOS, and the web.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://padi-plug-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6bbef027-e176-4a83-b64b-97d077ac434a).

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
