import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ship, FileText, University, Package } from "lucide-react";
import logoPath from "@assets/Picture1_1751117114784.jpg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="ImportFlow Logo" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-secondary-900">ImportFlow</h1>
                <p className="text-sm text-secondary-600">Management System</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-semibold shadow-lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            Streamline Your Import Operations
          </h1>
          <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
            Complete end-to-end workflow management for importing goods, from initial needs statement to final settlement.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-xl font-bold shadow-xl rounded-lg transform transition hover:scale-105"
          >
            Get Started - Sign In
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-blue-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                Request Management
              </h3>
              <p className="text-secondary-600">
                Create and track import requests from initial needs to approval
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <University className="text-green-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                Financial Management
              </h3>
              <p className="text-secondary-600">
                Handle letters of credit, contracts, and final settlements
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ship className="text-purple-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                Shipping Coordination
              </h3>
              <p className="text-secondary-600">
                Vessel nomination, tracking, and discharge management
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-orange-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                Complete Tracking
              </h3>
              <p className="text-secondary-600">
                Real-time status updates throughout the entire workflow
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Overview */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-secondary-900 mb-8">
            10-Step Import Workflow
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              "Statement of Needs",
              "Contract Request", 
              "Contract Drafting",
              "Letter of Credit",
              "Vessel Nomination",
              "Shipping Instructions",
              "Ship Loading",
              "Notice of Readiness",
              "Discharge",
              "Final Settlement"
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary-600 font-semibold">{index + 1}</span>
                </div>
                <p className="text-sm text-secondary-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-secondary-600">
            © 2024 ImportFlow Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
