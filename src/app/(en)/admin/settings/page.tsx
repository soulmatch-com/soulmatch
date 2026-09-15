import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-2">Configure admin panel settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
            <CardDescription>System configuration and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Settings interface coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
