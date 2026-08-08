// Supabase Configuration
const String supabaseUrl = 'https://lhmrvpvbhymtqqkyystr.supabase.co';
const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobXJ2cHZiaHltdHFxa3l5c3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDE4MDEsImV4cCI6MjEwMTYxNzgwMX0.2d16X4Fc4L3gnKFjZVC_DOpM-NBnAZfF4TkqGoKlym8';

// API Endpoints
const String apiBaseUrl = 'https://lhmrvpvbhymtqqkyystr.supabase.co/rest/v1';
const String functionsUrl = 'https://lhmrvpvbhymtqqkyystr.supabase.co/functions/v1';

// Feature Flags
const bool enableOfflineSync = true;
const bool enableRealtimeSync = true;
const bool enableAnalytics = true;

// API Timeouts
const Duration apiTimeout = Duration(seconds: 30);
const Duration connectionTimeout = Duration(seconds: 15);
