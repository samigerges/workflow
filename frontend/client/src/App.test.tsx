import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Router as WouterRouter } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { Router } from "./App";

function renderWithRoute(path: string) {
  const { hook } = memoryLocation({ path });

  return render(
    <WouterRouter hook={hook}>
      <Router />
    </WouterRouter>,
  );
}

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/pages/login", () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock("@/pages/analytics-preview", () => ({
  default: () => <div>Analytics Preview Content</div>,
}));

vi.mock("@/pages/dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));

describe("Router", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects logged-out users to the login page when hitting the root path", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    renderWithRoute("/");

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  it("allows logged-out users to view the analytics preview", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    renderWithRoute("/analytics");

    expect(
      await screen.findByText("Analytics Preview Content"),
    ).toBeInTheDocument();
  });

  it("shows the dashboard when the user is authenticated", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });

    renderWithRoute("/");

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });

  it("redirects authenticated users away from the login page", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });

    renderWithRoute("/login");

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });
});
