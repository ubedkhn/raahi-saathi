import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Car, CreditCard, Users, Scale } from "lucide-react";

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground space-y-2">
      {children}
    </CardContent>
  </Card>
);

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-card border-b border-border z-50 px-4 h-14 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-primary">Terms & Conditions</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Last updated: March 9, 2026. By using Raahi, you agree to the following terms.
        </p>

        <Section icon={Users} title="User Responsibilities">
          <p>• Provide accurate personal information during registration and keep it up to date.</p>
          <p>• Maintain respectful and courteous conduct with all riders and drivers.</p>
          <p>• Do not engage in fraudulent, abusive, or illegal activities on the platform.</p>
          <p>• Ensure your contact information is valid for ride coordination and safety purposes.</p>
          <p>• Users must be 18 years or older to use the platform.</p>
        </Section>

        <Section icon={Car} title="Driver Requirements">
          <p>• Hold a valid driving license and comply with all local traffic regulations.</p>
          <p>• Maintain your vehicle in safe, roadworthy condition with valid insurance.</p>
          <p>• Complete KYC verification (Aadhaar + Driving License) before posting rides.</p>
          <p>• Drive safely and responsibly; never drive under the influence of alcohol or drugs.</p>
          <p>• Accept or decline ride requests promptly and honor confirmed bookings.</p>
        </Section>

        <Section icon={CreditCard} title="Payment Policies">
          <p>• Fare charges are calculated based on distance and the driver's set rate per kilometer.</p>
          <p>• All payments are processed securely through the platform; direct cash exchanges are discouraged.</p>
          <p>• Refunds for cancelled rides follow our cancellation policy: free cancellation up to 30 minutes before departure.</p>
          <p>• Raahi charges a nominal platform fee (up to 10%) to maintain operations and safety features.</p>
          <p>• Wallet top-ups and withdrawals are subject to standard processing times.</p>
        </Section>

        <Section icon={Shield} title="Privacy & Safety">
          <p>• Your personal data is encrypted and stored securely in compliance with applicable laws.</p>
          <p>• Location data is used only during active rides for safety and navigation purposes.</p>
          <p>• Emergency SOS features are available during all active rides.</p>
          <p>• We never share your Aadhaar or license details with other users.</p>
          <p>• Ride OTP verification ensures only the correct rider boards the vehicle.</p>
        </Section>

        <Section icon={Scale} title="Dispute Resolution">
          <p>• Disputes between riders and drivers should first be reported via the in-app Support system.</p>
          <p>• Our support team will review and mediate disputes within 48 hours.</p>
          <p>• Repeated violations may result in account suspension or permanent ban.</p>
          <p>• Raahi reserves the right to modify these terms with prior notice to users.</p>
        </Section>

        <p className="text-xs text-center text-muted-foreground pt-4 pb-8">
          © 2026 Raahi. All rights reserved. For questions, contact us via in-app Support.
        </p>
      </div>
    </div>
  );
};

export default Terms;
