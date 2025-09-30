"use client";

import UpgradeModal from "@/components/upgrade-modal";
import LoginModal from "@/components/login-modal";
import Header from "@/components/header";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

export default function UpgradePage() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleClose = () => {
    router.back();
  };

  const handleShowLogin = () => {
    setShowLoginModal(true);
  };

  return (
    <>
      <Header title="Upgrade" subtitle="Choose your plan" variant="page" />

      <div className="pt-32 px-6">
        <div className="max-w-4xl mx-auto">
          <Suspense>
            <UpgradeModal
              isOpen={true}
              onClose={handleClose}
              onShowLogin={handleShowLogin}
              standalone={true}
            />
          </Suspense>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
