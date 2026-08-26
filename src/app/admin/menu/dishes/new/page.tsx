"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DishEditorForm } from "@/components/admin/DishEditorForm";

function NewDishForm() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") ?? undefined;
  return <DishEditorForm mode="create" initialCategoryId={categoryId} />;
}

export default function NewDishPage() {
  return (
    <Suspense fallback={null}>
      <NewDishForm />
    </Suspense>
  );
}
