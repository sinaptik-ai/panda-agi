import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ContactFormCard from "@/components/contact-form-card";

// Server Component - doesn't use client-side hooks
export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 flex flex-col items-center justify-center gap-8">
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Next.js with shadcn/ui</h1>
        <p className="text-muted-foreground">A modern UI built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui</p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Components</CardTitle>
            <CardDescription>Explore the shadcn/ui components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Buttons</h3>
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Input</h3>
              <Input placeholder="Enter text here..." />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="w-full">
                View Documentation
              </a>
            </Button>
          </CardFooter>
        </Card>

        <ContactFormCard />
      </main>

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui</p>
        <div className="flex justify-center gap-4 mt-4">
          <a 
            href="https://nextjs.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline hover:underline-offset-4"
          >
            Next.js
          </a>
          <a 
            href="https://ui.shadcn.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline hover:underline-offset-4"
          >
            shadcn/ui
          </a>
          <a 
            href="https://tailwindcss.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline hover:underline-offset-4"
          >
            Tailwind CSS
          </a>
        </div>
      </footer>
    </div>
  );
}
