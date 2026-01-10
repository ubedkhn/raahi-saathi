import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Plus, Phone, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
}

const EmergencyContacts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: ''
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error loading contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    // Phone must be exactly 10 digits (without +91)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length !== 10) {
      newErrors.phone = "Phone must be exactly 10 digits";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddContact = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Format phone with +91
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const formattedPhone = `+91${phoneDigits}`;

      const { error } = await supabase
        .from("emergency_contacts")
        .insert({
          user_id: session.user.id,
          name: formData.name.trim(),
          phone: formattedPhone,
          relationship: formData.relationship.trim() || null
        });

      if (error) throw error;

      toast.success("Emergency contact added!");
      setFormData({ name: '', phone: '', relationship: '' });
      setDialogOpen(false);
      loadContacts();
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      toast.success("Contact removed");
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to remove contact");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Emergency Contacts
          </h1>
          <p className="text-muted-foreground">Manage contacts for SOS alerts</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Emergency Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Contact name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`min-h-[44px] ${errors.name ? 'border-destructive' : ''}`}
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground">
                    +91
                  </div>
                  <Input
                    id="phone"
                    placeholder="10 digit number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className={`min-h-[44px] rounded-l-none ${errors.phone ? 'border-destructive' : ''}`}
                    maxLength={10}
                  />
                </div>
                {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="relationship">Relationship (optional)</Label>
                <Input
                  id="relationship"
                  placeholder="e.g., Father, Mother, Friend"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="min-h-[44px]"
                />
              </div>

              <Button 
                onClick={handleAddContact} 
                className="w-full min-h-[44px]"
                disabled={submitting}
              >
                {submitting ? "Adding..." : "Add Contact"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Contacts ({contacts.length})</CardTitle>
          <CardDescription>
            These contacts will receive SOS alerts in emergencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Emergency Contacts</h3>
              <p className="text-muted-foreground mb-4">
                Add contacts to receive SOS alerts during emergencies
              </p>
              <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.phone}
                        {contact.relationship && ` • ${contact.relationship}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `tel:${contact.phone}`}
                      className="min-h-[40px]"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="min-h-[40px]">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Contact?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {contact.name} from your emergency contacts.
                            They will no longer receive SOS alerts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteContact(contact.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access to SOS */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Need Help Now?</h3>
              <p className="text-sm text-muted-foreground">Trigger SOS to alert all your contacts</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => navigate('/sos')}
              className="min-h-[44px]"
            >
              Go to SOS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyContacts;