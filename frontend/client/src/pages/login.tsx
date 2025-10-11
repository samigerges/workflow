import { useState } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";

const AUTH_QUERY_KEY = ["/api/auth/user"] as const;

type AuthTab = "login" | "register";

type FormEvent = React.FormEvent<HTMLFormElement>;

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;

export default function Login() {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [loginEmail, setLoginEmail] = useState("admin@example.com");
  const [loginPassword, setLoginPassword] = useState("ChangeMe123!");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/login", {
        email: loginEmail,
        password: loginPassword,
      });

      const user = await response.json();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      setLocation("/");

      toast({
        title: "Welcome back",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to sign in",
        description: "Please double-check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const nextEmail = regEmail;
      const nextPassword = regPassword;

      const response = await apiRequest("POST", "/api/register", {
        email: nextEmail,
        password: nextPassword,
        firstName,
        lastName,
      });

      await response.json();

      toast({
        title: "Account created",
        description: "Your ImportFlow account is ready. Sign in to get started!",
      });

      setRegEmail("");
      setRegPassword("");
      setFirstName("");
      setLastName("");

      setActiveTab("login");
      setLoginEmail(nextEmail);
      setLoginPassword(nextPassword);
    } catch (error) {
      console.error(error);
      toast({
        title: "Registration failed",
        description: "We couldn't create your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const gradientOrb =
    "pointer-events-none absolute -inset-[40%] origin-center rounded-full bg-gradient-to-br from-sky-500/30 via-indigo-500/20 to-transparent blur-3xl";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute inset-x-0 top-[-20%] h-[480px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_rgba(15,23,42,0))]" />
        <div className="absolute inset-y-0 left-[-30%] w-[720px] bg-[radial-gradient(circle,_rgba(129,140,248,0.28),_rgba(15,23,42,0))]" />
        <div className="absolute inset-y-0 right-[-30%] w-[720px] bg-[radial-gradient(circle,_rgba(14,165,233,0.25),_rgba(15,23,42,0))]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-slate-950/30 px-12 py-16 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(15,118,255,0.2),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(30,64,175,0.32),_rgba(13,148,136,0.18)_45%,_transparent)]" />
          <div className="absolute inset-12 rounded-3xl border border-white/5 bg-slate-900/30 blur-3xl" />
          <div className="relative z-10 flex w-full flex-col justify-between">
            <div className="space-y-8">
              <div className="flex items-center gap-3 text-slate-200">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 font-semibold text-lg shadow-lg shadow-sky-500/30">
                  IF
                </span>
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-200/70">
                    ImportFlow
                  </p>
                  <h1 className="text-3xl font-semibold text-white">
                    Logistics without the chaos
                  </h1>
                </div>
              </div>

              <p className="max-w-lg text-lg text-slate-200/80">
                Streamline customs documentation, coordinate shipments, and stay on
                top of every milestone with a unified view of your global trade
                operations.
              </p>

            </div>

            <div className="space-y-4">
              <Separator className="border-white/10" />
              <div className="flex items-center gap-3 text-sm text-slate-300/80">
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20">
                  <div className={gradientOrb} />
                </div>
                <div>
                  <p className="font-medium text-slate-200">Trusted by operations teams</p>
                  <p className="text-xs text-slate-300/70">
                    "ImportFlow consolidates everything from requests to fulfillment in
                    one workspace. Our team hasn't missed a deadline since."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-6 py-14 sm:px-10 lg:px-16">
          <div className="absolute inset-y-10 right-10 hidden h-32 w-32 rounded-full border border-white/10 md:block" />
          <Card className="relative z-10 w-full max-w-md border-white/10 bg-slate-950/70 shadow-[0_40px_120px_-40px_rgba(15,118,255,0.35)] backdrop-blur">
            <CardHeader className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-200/80">
                ImportFlow Portal
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold text-white">
                  Command center access
                </CardTitle>
                <CardDescription className="text-base text-slate-300/80">
                  Manage shipments, documents, and partners from one intuitive
                  dashboard.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as AuthTab)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 border border-white/10 bg-white/5 p-1 text-slate-200">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                  >
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                  >
                    Create account
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="login-email" className="text-slate-200">
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(event: InputChangeEvent) =>
                          setLoginEmail(event.target.value)
                        }
                        placeholder="you@company.com"
                        required
                        className="border-white/10 bg-slate-900/80 text-slate-50 placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="login-password" className="text-slate-200">
                        Password
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(event: InputChangeEvent) =>
                          setLoginPassword(event.target.value)
                        }
                        placeholder="Your password"
                        required
                        className="border-white/10 bg-slate-900/80 text-slate-50 placeholder:text-slate-500"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Enter workspace"}
                    </Button>
                    <p className="text-center text-xs text-slate-400">
                      Default login: <strong>admin@example.com</strong> / <strong>ChangeMe123!</strong>
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-6">
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 text-left">
                        <Label htmlFor="firstName" className="text-slate-200">
                          First name
                        </Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(event: InputChangeEvent) =>
                            setFirstName(event.target.value)
                          }
                          placeholder="Avery"
                          required
                          className="border-white/10 bg-slate-900/80 text-slate-50 placeholder:text-slate-500"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label htmlFor="lastName" className="text-slate-200">
                          Last name
                        </Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(event: InputChangeEvent) =>
                            setLastName(event.target.value)
                          }
                          placeholder="Lane"
                          required
                          className="border-white/10 bg-slate-900/80 text-slate-50 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="reg-email" className="text-slate-200">
                        Work email
                      </Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(event: InputChangeEvent) =>
                          setRegEmail(event.target.value)
                        }
                        placeholder="operations@company.com"
                        required
                        className="border-white/10 bg-slate-900/80 text-slate-50 placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="reg-password" className="text-slate-200">
                        Password
                      </Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={regPassword}
                        onChange={(event: InputChangeEvent) =>
                          setRegPassword(event.target.value)
                        }
                        placeholder="Create a secure password"
                        required
                        className="border-white/10 bg-slate-900/80 text-slate-50 placeholder:text-slate-500"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-indigo-500 text-slate-50 hover:bg-indigo-400"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating account..." : "Start free trial"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
