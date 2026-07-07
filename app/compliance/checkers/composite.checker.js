export async function checkCompositeAny(params, getRuleResult) {
  const ruleIds = params.ruleIds ?? [];
  const results = await Promise.all(ruleIds.map((id) => getRuleResult(id)));

  const passed = results.filter((r) => r?.status === "PASS");
  if (passed.length > 0) {
    return {
      status: "PASS",
      message: `Au moins une condition satisfaite (${passed.length}/${ruleIds.length}).`,
      details: { satisfiedRules: passed.map((r) => r.ruleId) },
    };
  }

  const messages = results
    .filter((r) => r && r.status !== "PASS")
    .map((r) => r.message)
    .join(" · ");

  return {
    status: "FAIL",
    message: messages || "Aucune des conditions alternatives n'est satisfaite.",
    details: { checkedRules: ruleIds, subResults: results.map((r) => ({ ruleId: r?.ruleId, status: r?.status })) },
  };
}

export async function checkCompositeAll(params, getRuleResult) {
  const ruleIds = params.ruleIds ?? [];
  const results = await Promise.all(ruleIds.map((id) => getRuleResult(id)));
  const failed = results.filter((r) => !r || r.status !== "PASS");

  if (failed.length === 0) {
    return {
      status: "PASS",
      message: "Toutes les conditions sont satisfaites.",
      details: { checkedRules: ruleIds },
    };
  }

  return {
    status: "FAIL",
    message: `${failed.length} condition(s) non satisfaite(s).`,
    details: {
      failedRules: failed.map((r) => ({ ruleId: r?.ruleId, message: r?.message })),
    },
  };
}
