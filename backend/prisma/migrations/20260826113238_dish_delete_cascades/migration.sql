-- DropForeignKey
ALTER TABLE "DishIngredient" DROP CONSTRAINT "DishIngredient_dishId_fkey";

-- DropForeignKey
ALTER TABLE "ModifierChoice" DROP CONSTRAINT "ModifierChoice_groupId_fkey";

-- DropForeignKey
ALTER TABLE "ModifierGroup" DROP CONSTRAINT "ModifierGroup_dishId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_dishId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_relatedDishId_fkey";

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierChoice" ADD CONSTRAINT "ModifierChoice_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_relatedDishId_fkey" FOREIGN KEY ("relatedDishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
