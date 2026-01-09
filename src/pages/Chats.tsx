import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Chats = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Card>
        <CardContent className="text-center py-16">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Chats Coming Soon</h2>
          <p className="text-muted-foreground">
            Chat with drivers and riders directly in the app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chats;
