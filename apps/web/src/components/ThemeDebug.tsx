export function ThemeDebug() {
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-card border rounded-lg shadow-lg">
      <h3 className="font-semibold mb-2">Theme Debug</h3>
      <div className="space-y-1 text-sm">
        <div>HTML class: {document.documentElement.className || 'none'}</div>
        <div>Body class: {document.body.className || 'none'}</div>
        <div className="flex gap-2">
          <div className="w-20 h-10 bg-background border">bg</div>
          <div className="w-20 h-10 bg-card border">card</div>
          <div className="w-20 h-10 bg-primary text-primary-foreground flex items-center justify-center">primary</div>
        </div>
      </div>
    </div>
  );
}