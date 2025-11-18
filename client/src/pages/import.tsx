import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertCircle, FileUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    total: number;
    matched: number;
    unmatched: number;
    unmatchedShows?: string[];
  } | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'tv_time');

      const response = await fetch('/api/import/tv-time', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows'] });
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${data.matched} show${data.matched !== 1 ? 's' : ''}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-lg">
          <Upload className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">Import Data</h1>
          <p className="text-muted-foreground">Import your watch history from TV Time</p>
        </div>
      </div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertTitle className="font-heading">How to Export from TV Time</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
            <li>Open TV Time app or website</li>
            <li>Go to Settings → Privacy & Data</li>
            <li>Select "Export my data"</li>
            <li>Download the tracking_prod_history.csv file</li>
            <li>Upload it here to import your watch history</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">TV Time CSV Import</CardTitle>
          <CardDescription>
            Upload your TV Time export file to automatically import your shows and watch progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={importMutation.isPending}
                  data-testid="input-import-file"
                />
                {file && (
                  <Badge variant="outline" className="flex-shrink-0">
                    <FileUp className="w-3 h-3 mr-1" />
                    {file.name}
                  </Badge>
                )}
              </div>
            </div>

            {importMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Importing shows...</span>
                  <span className="font-medium">Please wait</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              className="w-full"
              data-testid="button-import"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importMutation.isPending ? 'Importing...' : 'Import Shows'}
            </Button>
          </div>

          {importResult && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-heading font-bold text-primary">
                        {importResult.total}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Total Shows</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle2 className="w-5 h-5 text-accent mr-2" />
                        <p className="text-2xl font-heading font-bold text-accent">
                          {importResult.matched}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Matched</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <AlertCircle className="w-5 h-5 text-destructive mr-2" />
                        <p className="text-2xl font-heading font-bold text-destructive">
                          {importResult.unmatched}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Unmatched</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {importResult.unmatched > 0 && importResult.unmatchedShows && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle className="font-heading">Unmatched Shows</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">The following shows could not be matched automatically:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {importResult.unmatchedShows.slice(0, 10).map((show, idx) => (
                        <li key={idx}>{show}</li>
                      ))}
                      {importResult.unmatchedShows.length > 10 && (
                        <li>And {importResult.unmatchedShows.length - 10} more...</li>
                      )}
                    </ul>
                    <p className="mt-2 text-sm">
                      You can manually search and add these shows from the Search page.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Future Import Sources</CardTitle>
          <CardDescription>
            Additional import sources will be available in future updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg opacity-50">
              <h3 className="font-heading font-semibold mb-1">Trakt.tv</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
            <div className="p-4 border rounded-lg opacity-50">
              <h3 className="font-heading font-semibold mb-1">MyAnimeList</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
