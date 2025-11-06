import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Shield, Users, MapPin, Clock, CreditCard } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative gradient-hero text-white pt-20 pb-32 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Travel Together, Save Together
          </h1>
          <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            India's peer-to-peer ride sharing platform. Connect with travelers going your way.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              variant="find-ride"
              onClick={handleGetStarted}
              className="min-w-[200px] uppercase font-semibold"
            >
              I Need a Ride
            </Button>
            <Button 
              size="lg"
              variant="offer-ride"
              onClick={handleGetStarted}
              className="min-w-[200px] uppercase font-semibold"
            >
              I'm Offering a Ride
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Raahi?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<CreditCard className="w-10 h-10" />}
              title="Save Money"
              description="Share rides, share costs. Pay only ₹6-12 per km based on vehicle type."
            />
            <FeatureCard 
              icon={<Clock className="w-10 h-10" />}
              title="Save Time"
              description="Real-time matching with travelers on similar routes. No waiting around."
            />
            <FeatureCard 
              icon={<MapPin className="w-10 h-10" />}
              title="Long Distance"
              description="Perfect for intercity travel. Bhopal to Indore and beyond."
            />
            <FeatureCard 
              icon={<Shield className="w-10 h-10" />}
              title="Safe & Verified"
              description="Full KYC verification, live tracking, and emergency SOS features."
            />
            <FeatureCard 
              icon={<Users className="w-10 h-10" />}
              title="Trusted Community"
              description="Ratings and reviews ensure you travel with trustworthy people."
            />
            <FeatureCard 
              icon={<Car className="w-10 h-10" />}
              title="Flexible Options"
              description="Choose your preferences: gender, smoking, luggage, and more."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-primary">For Riders</h3>
              <div className="space-y-4">
                <Step number={1} text="Search for rides going your way" />
                <Step number={2} text="Book instantly with verified drivers" />
                <Step number={3} text="Track your ride in real-time" />
                <Step number={4} text="Pay securely via UPI or card" />
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-6 text-primary">For Drivers</h3>
              <div className="space-y-4">
                <Step number={1} text="Post your upcoming trip" />
                <Step number={2} text="Accept booking requests" />
                <Step number={3} text="Share the ride and earn" />
                <Step number={4} text="Get rated by riders" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of travelers saving money and making connections across India.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-secondary hover:bg-secondary-hover text-secondary-foreground font-medium uppercase"
          >
            Sign Up Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-card border-t">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>© 2025 Raahi. Safe, verified peer-to-peer ride sharing.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="gradient-card p-6 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow">
    <div className="text-primary mb-4 flex justify-center">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const Step = ({ number, text }: { number: number; text: string }) => (
  <div className="flex items-start gap-4">
    <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
      {number}
    </div>
    <p className="text-lg">{text}</p>
  </div>
);

export default Landing;
