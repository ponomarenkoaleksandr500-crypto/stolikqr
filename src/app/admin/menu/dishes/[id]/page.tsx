"use client";

import { useParams } from "next/navigation";
import { DishEditorForm } from "@/components/admin/DishEditorForm";

export default function EditDishPage() {
  const params = useParams<{ id: string }>();
  return <DishEditorForm mode="edit" dishId={params.id} />;
}
