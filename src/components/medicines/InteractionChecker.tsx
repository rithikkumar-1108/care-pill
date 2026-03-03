import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlaskConical, Plus, X, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

const INTERACTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-interactions`;

export function InteractionChecker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const addMedicine = () => {
    const name = currentInput.trim();
    if (!name || medicines.length >= 10) return;
    if (medicines.some((m) => m.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Already added', variant: 'destructive' });
      return;
    }
    setMedicines((prev) => [...prev, name]);
    setCurrentInput('');
  };

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMedicine();
    }
  };

  const checkInteractions = async () => {
    if (medicines.length < 2) {
      toast({ title: 'Add at least 2 medicines', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setResult('');
    setIsExpanded(true);

    try {
      const resp = await fetch(INTERACTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ medicines }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        toast({ title: err.error || 'Error checking interactions', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResult(accumulated);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to check interactions', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const reset = () => {
    setMedicines([]);
    setCurrentInput('');
    setResult('');
    setIsExpanded(false);
  };

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const loadSuggestions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('medicines')
      .select('name')
      .eq('user_id', user.id)
      .eq('is_active', true);
    if (data) setSuggestions(data.map((m) => m.name));
  };

  const shouldTruncate = result.length > 500 && !isExpanded;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadSuggestions(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FlaskConical className="h-4 w-4" />
          Interaction Checker
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Medication Interaction Checker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Input area */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Type a medicine name..."
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1"
              />
              <Button size="icon" onClick={addMedicine} disabled={!currentInput.trim() || isLoading}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Your medicines:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions
                    .filter((s) => !medicines.some((m) => m.toLowerCase() === s.toLowerCase()))
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => setMedicines((prev) => [...prev, s])}
                        disabled={isLoading || medicines.length >= 10}
                        className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {medicines.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {medicines.map((m, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {m}
                    <button onClick={() => removeMedicine(i)} disabled={isLoading} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={checkInteractions} disabled={medicines.length < 2 || isLoading} className="flex-1 gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {isLoading ? 'Analyzing...' : 'Check Interactions'}
            </Button>
            {(result || medicines.length > 0) && (
              <Button variant="outline" onClick={reset} disabled={isLoading}>
                Clear
              </Button>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <ScrollArea className={shouldTruncate ? 'max-h-[200px]' : 'max-h-[40vh]'}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{shouldTruncate ? result.slice(0, 500) + '...' : result}</ReactMarkdown>
                </div>
              </ScrollArea>
              {result.length > 500 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1 text-primary"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" /> Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" /> Read More
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
