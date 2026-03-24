"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PROTOCOL_WEEKS } from "@/lib/data";

interface ProgressState {
  completedTasks: string[];
  preparedRecipes: string[];
  dailyCheckins: string[]; // "YYYY-MM-DD"
}

const defaultState: ProgressState = {
  completedTasks: [],
  preparedRecipes: [],
  dailyCheckins: [],
};

export function useProgress(userId: string, currentWeek: number) {
  const [state, setState] = useState<ProgressState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const supabase = createClient();

  // Fetch initial data from Supabase
  useEffect(() => {
    if (!userId) return;

    async function fetchData() {
      const [tasksRes, recipesRes, checkinsRes] = await Promise.all([
        supabase.from("completed_tasks").select("task_id").eq("user_id", userId),
        supabase.from("prepared_recipes").select("recipe_id").eq("user_id", userId),
        supabase.from("daily_checkins").select("checkin_date").eq("user_id", userId),
      ]);

      setState({
        completedTasks: tasksRes.data?.map((r) => r.task_id) ?? [],
        preparedRecipes: recipesRes.data?.map((r) => r.recipe_id) ?? [],
        dailyCheckins: checkinsRes.data?.map((r) => r.checkin_date) ?? [],
      });
      setLoaded(true);
    }

    fetchData();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTask = useCallback(
    async (taskId: string) => {
      const has = state.completedTasks.includes(taskId);

      // Optimistic update
      setState((prev) => ({
        ...prev,
        completedTasks: has
          ? prev.completedTasks.filter((id) => id !== taskId)
          : [...prev.completedTasks, taskId],
      }));

      if (has) {
        await supabase
          .from("completed_tasks")
          .delete()
          .eq("user_id", userId)
          .eq("task_id", taskId);
      } else {
        await supabase
          .from("completed_tasks")
          .insert({ user_id: userId, task_id: taskId });

        // Check week progression after adding a task
        checkWeekProgression([...state.completedTasks, taskId]);
      }
    },
    [state.completedTasks, userId, supabase, currentWeek] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const toggleRecipe = useCallback(
    async (recipeId: string) => {
      const has = state.preparedRecipes.includes(recipeId);

      setState((prev) => ({
        ...prev,
        preparedRecipes: has
          ? prev.preparedRecipes.filter((id) => id !== recipeId)
          : [...prev.preparedRecipes, recipeId],
      }));

      if (has) {
        await supabase
          .from("prepared_recipes")
          .delete()
          .eq("user_id", userId)
          .eq("recipe_id", recipeId);
      } else {
        await supabase
          .from("prepared_recipes")
          .insert({ user_id: userId, recipe_id: recipeId });
      }
    },
    [state.preparedRecipes, userId, supabase]
  );

  const checkinToday = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    if (state.dailyCheckins.includes(today)) return;

    setState((prev) => ({
      ...prev,
      dailyCheckins: [...prev.dailyCheckins, today],
    }));

    await supabase
      .from("daily_checkins")
      .insert({ user_id: userId, checkin_date: today });
  }, [state.dailyCheckins, userId, supabase]);

  const isTaskCompleted = useCallback(
    (taskId: string) => state.completedTasks.includes(taskId),
    [state.completedTasks]
  );

  const isRecipePrepared = useCallback(
    (recipeId: string) => state.preparedRecipes.includes(recipeId),
    [state.preparedRecipes]
  );

  const today = new Date().toISOString().split("T")[0];
  const todayCheckedIn = state.dailyCheckins.includes(today);

  const streak = (() => {
    let count = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().split("T")[0];
      if (state.dailyCheckins.includes(key)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  })();

  // Brain Score calculation
  const brainScore = useMemo(() => {
    const base = 60;
    const taskBonus = Math.min(20, state.completedTasks.length * 2);
    const recipeBonus = Math.min(24, state.preparedRecipes.length * 3);
    const streakBonus = Math.min(10, streak * 1);
    return Math.min(100, base + taskBonus + recipeBonus + streakBonus);
  }, [state.completedTasks.length, state.preparedRecipes.length, streak]);

  // Check if all tasks for the current week are completed and advance week
  const checkWeekProgression = useCallback(
    async (completedTasks: string[]) => {
      const weekData = PROTOCOL_WEEKS[currentWeek - 1];
      if (!weekData) return;

      const allWeekTasksCompleted = weekData.tasks.every((task) =>
        completedTasks.includes(task.id)
      );

      if (allWeekTasksCompleted && currentWeek < 8) {
        // Recalculate brain score with the latest completedTasks
        const base = 60;
        const taskBonus = Math.min(20, completedTasks.length * 2);
        const recipeBonus = Math.min(24, state.preparedRecipes.length * 3);
        const streakBonus = Math.min(10, streak * 1);
        const updatedBrainScore = Math.min(100, base + taskBonus + recipeBonus + streakBonus);

        await supabase
          .from("profiles")
          .update({
            current_week: currentWeek + 1,
            brain_score: updatedBrainScore,
          })
          .eq("id", userId);
      } else {
        // Still update brain_score even if not progressing week
        const base = 60;
        const taskBonus = Math.min(20, completedTasks.length * 2);
        const recipeBonus = Math.min(24, state.preparedRecipes.length * 3);
        const streakBonus = Math.min(10, streak * 1);
        const updatedBrainScore = Math.min(100, base + taskBonus + recipeBonus + streakBonus);

        await supabase
          .from("profiles")
          .update({ brain_score: updatedBrainScore })
          .eq("id", userId);
      }
    },
    [currentWeek, state.preparedRecipes.length, streak, userId, supabase]
  );

  return {
    ...state,
    loaded,
    toggleTask,
    toggleRecipe,
    checkinToday,
    isTaskCompleted,
    isRecipePrepared,
    todayCheckedIn,
    streak,
    brainScore,
  };
}
