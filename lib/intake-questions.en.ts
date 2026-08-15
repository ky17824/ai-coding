export type QuestionCopy = {
  question: string;
  options: [string, string, string, string];
  followUp: string;
  action: string;
};

const q = (
  question: string,
  options: [string, string, string, string],
  followUp: string,
  action: string
): QuestionCopy => ({ question, options, followUp, action });

export const EN_STAGE_COPY = {
  early: {
    label: "Readiness Stage 1",
    phase: "Plan",
    intro: "You are defining a target country and the resources you can commit. Choose the answer that reflects where you are today; there is no penalty for work you have not started.",
    unlocks: "You can commit to a target country and fund local regulatory and market research."
  },
  preparing: {
    label: "Readiness Stage 2",
    phase: "Enable",
    intro: "You are researching local regulations and the market, then testing your assumptions. Select only what you have actually done.",
    unlocks: "You can begin limited commercial activity and enter into partner agreements."
  },
  ready: {
    label: "Readiness Stage 3",
    phase: "Execute entry criteria",
    intro: "You are preparing to execute market entry. These questions focus on documentation, contracts, and people.",
    unlocks: "You can launch local operations and validate repeatable results and scale."
  }
} as const;

export const EN_ITEM_COPY = {
  "global-mindset": { label: "Global expansion alignment", owner: "CEO and board" },
  resources: { label: "People and operating resources", owner: "CEO and finance lead" },
  "home-pmf": { label: "Value proposition and home-market product-market fit", owner: "CEO and product lead" },
  "target-market": { label: "Target country and initial customer segment", owner: "Business development lead" },
  bmlc: { label: "Business Model Localization Canvas: regulatory and cultural analysis", owner: "Regulatory and legal lead" },
  lpa: { label: "Localization Premium Analysis: six-dimension market research", owner: "Product and operations lead" },
  "market-testing": { label: "Market testing", owner: "Product and GTM lead" },
  "partner-acquisition": { label: "Network and partner development", owner: "Business development lead" },
  "local-plan": { label: "Local Business Model Canvas and 30·60·90-day plan", owner: "CEO and GTM lead" },
  "local-team": { label: "Minimum local operating team", owner: "CEO and people lead" },
  "partner-contract": { label: "Partner contracting and operations", owner: "Business development and legal lead" },
  "resource-allocation": { label: "Local operating resource allocation", owner: "Finance lead" }
} as const;

export const EN_QUESTION_COPY: Record<string, QuestionCopy> = {
  "mvc-purpose-alignment": q(
    "Do you and your leadership team give the same reason for why the company should expand globally?",
    ["We have not aligned on this as a leadership team.", "We have discussed it, but each leader explains it differently.", "We documented the purpose once and mostly explain it the same way.", "We have used that shared purpose to make several real decisions."],
    "Describe how each leader explains the purpose and where their views differ.",
    "Collect each leader's one-sentence reason for expansion, resolve the differences, and agree on one shared purpose."
  ),
  "mvc-stop-criteria": q(
    "Have you defined when and how you will respond if global expansion underperforms?",
    ["We have not considered that yet.", "We have discussed it but have not set criteria.", "We defined the metric, threshold, and period that would trigger action.", "We have actually reduced or stopped an initiative using those criteria."],
    "State the metric, how long it may miss the threshold, and the action that follows.",
    "Define the metrics, thresholds, and time periods for continuing, reducing, pivoting, or exiting, and obtain leadership approval."
  ),
  "mvc-resource-priority": q(
    "Have your domestic and global businesses competed for the same people or budget? If so, how did you decide?",
    ["We have not allocated separate people or budget to global expansion.", "We allocated resources, but no conflict has occurred yet.", "A conflict occurred and we decided case by case.", "We have priority rules and apply them consistently."],
    "Describe the most recent conflict and which side you prioritized.",
    "Document how the company will prioritize resources when domestic and global needs conflict."
  ),
  "mvc-reference-market": q(
    "Have you chosen an initial target market where you can test whether your product or service creates value for global customers?",
    ["We have not chosen a reference market.", "We are still validating in our home market.", "We observed real customer behavior in our home market or a specific global market.", "The same result has repeated across multiple customers."],
    "Identify the market, the customer, and the behavior you observed.",
    "Choose a reference market and record real customer behavior that demonstrates value."
  ),
  "res-tce": q(
    "Have you calculated the full cost of this expansion, including certification, localization, people, legal, logistics, and marketing?",
    ["We have not calculated it.", "We have a rough estimate but no itemized budget.", "We itemized certification, localization, people, legal, logistics, marketing, and related costs.", "We update the estimate with actual quotes and spending."],
    "Enter the total and the three largest cost categories.",
    "Calculate the total cost of entry by itemizing certification, localization, people, legal, logistics, marketing, and support costs."
  ),
  "res-cash-runway": q(
    "Do you know how many months the company can operate if local revenue arrives later than expected?",
    ["We have not calculated it separately.", "We have a rough idea but no documented figure.", "We know the number of months and the cash amount.", "We have also defined what happens if we exceed that limit."],
    "Enter the number of months and the cash amount.",
    "Calculate the cash limit and runway if revenue is delayed."
  ),
  "res-no-grant-scope": q(
    "Have you defined the minimum scope you can execute with company funds if you receive no government grant?",
    ["Our plan assumes grant funding.", "We have considered the possibility but have no fallback scope.", "We defined a minimum scope that does not depend on grants.", "We are already executing that scope with company funds."],
    "Describe the country, customer segment, and product or service scope you can pursue without grant funding.",
    "Define the minimum country, customer segment, and offering scope the company can execute without grants."
  ),
  "res-owner-time": q(
    "Is one person accountable for leading this expansion, and do they have protected time for the work?",
    ["No owner is assigned; we divide the work as it comes up.", "An owner is named, but other responsibilities leave almost no time.", "An owner is assigned and spends a fixed amount of time each week.", "The owner leads this as a primary responsibility and is accountable for results."],
    "Enter the owner's role, actual hours per week, and other responsibilities.",
    "Assign an expansion owner and protect a fixed number of hours each week."
  ),
  "res-key-person-risk": q(
    "Would any decision or commercial relationship stall if one key person became unavailable?",
    ["We have not considered this.", "We know the risk exists but have not identified it.", "We know which decisions and relationships depend on that person.", "We have a backup owner or handoff process."],
    "List the decisions or relationships that would stop without that person.",
    "Inventory decisions and relationships tied to one person and define a backup."
  ),
  "pmf-paid-conversion": q(
    "Have you made a paid sale in your home market? If not, have you completed a paid proof of concept or pilot in your initial target country?",
    ["We have neither a paying home-market customer nor a paid proof of concept or pilot in the target country.", "Customers have shown interest, but we have not completed a paid sale or target-country validation.", "We completed either a paid home-market sale or a paid proof of concept or pilot in the target country.", "Repeat purchases, renewals, or usage growth have occurred across multiple domestic or international customers."],
    "Describe the paid home-market sale or target-country proof of concept or pilot. You may anonymize the customer; include the money or time committed and the market response observed.",
    "Secure a paid proof of concept or first order in the initial target country and record the money and time the customer committed."
  ),
  "pmf-churn-cases": q(
    "Have interested customers ever dropped out, and do you know why?",
    ["We have not had such a customer yet.", "A customer dropped out, but we did not learn why.", "We know which customer left, when, and why.", "We changed the product, service, or sales approach in response."],
    "Describe when the customer stopped and why.",
    "Ask churned customers when and why they stopped, and record the answers."
  ),
  "pmf-buying-roles": q(
    "Do you know who uses your offering and who decides to buy it inside a customer organization?",
    ["We have not separated those roles.", "We have assumptions but have not verified them.", "For recent deals, we can identify the user, buyer, and approver.", "We consistently tailor our approach to each role."],
    "For the three most recent deals, identify who raised the problem, used the offering, paid, and approved the purchase.",
    "Map the user, buyer, and approver in the three most recent deals."
  ),
  "pmf-customer-words": q(
    "Have customers told you directly why they chose or rejected your offering?",
    ["We have not asked.", "We have assumptions but have not verified them with customers.", "We asked customers directly and recorded their answers.", "The same reasons repeat across multiple customers."],
    "Write the customer's own words as closely as possible.",
    "Ask customers directly why they chose or rejected the offering and record their exact language."
  ),
  "mkt-icp-count": q(
    "Have you counted the actual companies that could become customers in your initial target market?",
    ["We have not chosen a target country.", "We chose a country but know the customer count only from top-down market data.", "We counted specific customers or accounts.", "We have begun outreach from that account list."],
    "Describe the customer list and the number of accounts.",
    "Build an account list in the target country and count those that match your ideal customer profile."
  ),
  "mkt-icp-source": q(
    "Where did that customer count come from: a statistical estimate or an actual account list?",
    ["We have not counted them.", "We estimated from population or industry statistics.", "We counted from lists, channels, facilities, or account data.", "We keep the underlying data current."],
    "Name the source and the date it was last updated.",
    "Document the source and as-of date for the account, channel, or facility data used in the count."
  ),
  "mkt-inbound-signal": q(
    "Have you received unsolicited inquiries or proposals from global markets before running ads or outbound sales?",
    ["Not yet.", "Yes, but we did not record the country or reason.", "We documented the country and nature of each inquiry.", "An inquiry led to a meeting, sample, or order."],
    "Describe the country and the inquiry.",
    "Organize pre-marketing global inquiries, orders, and proposals by country."
  ),
  "mkt-country-compare": q(
    "Have you compared multiple candidate countries using the same criteria?",
    ["We are considering only one country.", "We considered several countries but did not build a comparison.", "We created a comparison using defined criteria.", "We tested whether changing criteria or weights changes the ranking."],
    "List the comparison criteria and the top-ranked countries.",
    "Compare candidate countries on attractiveness, fit, barriers, accessibility, and learning value."
  ),
  "mkt-bias-check": q(
    "Would this market still rank first if you removed personal connections and government programs from the decision?",
    ["We have not tested that.", "The ranking would probably change.", "The same country remains first without those factors.", "An outside expert or local operator has also validated the choice."],
    "State how the ranking changes when those factors are removed.",
    "Recalculate the country ranking without personal-network or grant advantages."
  ),
  "bmlc-classification": q(
    "Have you confirmed how your product or service is legally classified in the target country?",
    ["We have not checked.", "We have a rough view based on online research or informal advice.", "We confirmed it using original regulator or official sources.", "A local expert or regulator confirmed the classification."],
    "Enter the agency, document, and confirmation date.",
    "Confirm the offering's classification and applicable rules from primary regulatory sources, and record the source and date."
  ),
  "bmlc-preconditions": q(
    "Do you know every license, certification, registration, label, tax, or customs requirement that must be met before sales begin?",
    ["We do not yet know what is required.", "We know some requirements but do not have a complete list.", "We have a complete requirements list.", "Each requirement has an owner, budget, deadline, and work in progress."],
    "List the requirements and any known cost or lead time.",
    "Create a complete list of licenses, certifications, registrations, labels, tax, and customs requirements required before sale."
  ),
  "bmlc-na-basis": q(
    "Did you mark any regulatory requirement as not applicable, and have you verified the basis for that decision?",
    ["We have not reviewed the requirements.", "We excluded items based only on an internal judgment.", "We verified the basis for each exclusion with source material.", "An expert or regulator confirmed the exclusions."],
    "List each requirement considered not applicable and the supporting basis.",
    "Obtain source evidence for every requirement marked not applicable."
  ),
  "bmlc-local-practice": q(
    "Have you learned how local commercial practices and payment terms differ from those in your home market?",
    ["We have not investigated.", "We have only read secondary material.", "We heard directly from local operators.", "We have experienced the differences in a real transaction or contract."],
    "Describe any practice that differed from your expectations.",
    "Confirm local commercial practices, payment terms, and trust requirements directly with local operators."
  ),
  "bmlc-hq-gap": q(
    "Have local customers reacted differently from what headquarters expected?",
    ["We have not received local customer feedback.", "We received feedback but found no meaningful difference.", "We identified reactions that differed from headquarters' assumptions.", "We changed the offering or message in response."],
    "Describe where headquarters and local customers saw things differently.",
    "Collect local customer feedback and document where it differs from headquarters' assumptions."
  ),
  "lpa-pricing-payment": q(
    "Do you know the price presentation and payment methods local customers expect?",
    ["We have not investigated.", "We have a rough view from research.", "We confirmed expectations directly with local customers or partners.", "We have used those methods in an actual quote or invoice."],
    "Describe what differs from your current approach.",
    "Confirm expected price presentation, payment methods, and credit terms with local customers or partners."
  ),
  "lpa-net-price": q(
    "Have you calculated what the local customer actually pays after taxes, exchange rates, fees, and refunds?",
    ["We have not calculated it.", "We know roughly but have no itemized calculation.", "We calculated each component and know the final amount.", "We verified the calculation in an actual settlement."],
    "Enter what you receive and what the customer pays.",
    "Calculate the customer's final payment by itemizing taxes, exchange rates, fees, and refunds."
  ),
  "lpa-infra-partner": q(
    "Have you selected local logistics, payment, cloud, or other infrastructure providers?",
    ["We have not researched them.", "We have candidates but no quotes or terms.", "We received terms and narrowed the candidates.", "We ran a small-volume or pilot transaction."],
    "Describe your selection criteria and any pilot you ran.",
    "Obtain quotes and terms from logistics, payment, and cloud providers, then narrow the candidates."
  ),
  "lpa-bridge-person": q(
    "Is there someone who understands both the local market and your offering well enough to bridge headquarters and the market?",
    ["We do not have that person.", "We need the role but have not found anyone.", "Someone currently performs the role.", "That person has enabled actual decisions or transactions."],
    "Identify the person and describe how they perform the role.",
    "Assign a person who can connect local market knowledge with headquarters' offering knowledge."
  ),
  "lpa-journey-blocker": q(
    "Have you observed where local users get stuck while discovering, buying, or using your offering?",
    ["No local user has tried it.", "Local users tried it, but we did not observe where they struggled.", "We directly observed the points of friction.", "We fixed those points and verified the improvement."],
    "Describe the points of friction across the customer journey.",
    "Observe the local discover-to-buy-to-use journey and identify where users get stuck."
  ),
  "test-environment": q(
    "Have you tested whether your product or service works under actual local conditions?",
    ["We have not tested it.", "We tested only at home and did not reproduce local conditions.", "We tested under representative local conditions.", "We repeatedly verified it through actual local use or delivery."],
    "Describe what you tested and under which conditions. For a service, include network, device, and data-regulation conditions.",
    "Design and run an operating test under representative local conditions."
  ),
  "test-defects": q(
    "Have you recorded the problems found in market testing and tracked how far each one has been resolved?",
    ["We have not run market testing.", "We ran a test but did not keep a separate issue log.", "We recorded the issues and their resolution status.", "We completed root-cause analysis and preventive action."],
    "List the issues found and those that remain unresolved.",
    "Maintain a market-test issue log with outcomes and unresolved items."
  ),
  "test-message-worked": q(
    "Do you know which local message, content, or demo actually generated inquiries?",
    ["We have not promoted the offering locally.", "We promoted it but do not know what worked.", "We know which messages led to inquiries or purchases.", "The same messages have worked repeatedly."],
    "Identify the messages, content, or demos that worked.",
    "Measure inquiry and purchase conversion rates by message, demo, and sample."
  ),
  "test-no-discount": q(
    "Has a customer purchased at full price without a discount or free offer?",
    ["We have no purchase yet.", "Every purchase included a discount or free offer.", "We have completed a full-price sale.", "Most transactions close without a discount."],
    "Describe the full-price transaction and its conditions.",
    "Test whether customers will close under a no-discount offer."
  ),
  "test-counter-evidence": q(
    "Have you found evidence that your current approach may not work in this market?",
    ["We have not looked for disconfirming evidence.", "We are concerned but have not found a specific signal.", "We found a specific signal or case.", "We changed the hypothesis and plan in response."],
    "Describe the signal and what you changed.",
    "Deliberately seek and record evidence that your value proposition may not work locally."
  ),
  "partner-actual-work": q(
    "Do you have a local partner, and are they actually performing the work they agreed to do?",
    ["We do not have a partner.", "We are in discussion or have only an MOU or letter of intent.", "We defined the role and the partner has performed part of it.", "The partner is repeatedly generating transactions."],
    "Describe the agreed responsibilities and what the partner has actually delivered.",
    "Document partner responsibilities and have the partner perform a defined portion of the work."
  ),
  "partner-economics": q(
    "Have you compared partner-led and direct sales economics using actual numbers?",
    ["We have not calculated them.", "We have an intuition but no numerical comparison.", "We compared margin, rebates, training, and support costs.", "We validated the comparison with actual transactions."],
    "Enter the per-deal economics for both routes.",
    "Compare partner-led and direct sales using margin, rebates, training, and support costs."
  ),
  "partner-ecosystem-interviews": q(
    "Have you interviewed a balanced mix of local users, buyers, distributors, procurement teams, and regulatory stakeholders?",
    ["We have not conducted interviews.", "We met a few people, but most had the same role.", "We interviewed people across several roles.", "We interviewed enough people by role to revise our hypothesis."],
    "Enter the number of interviews by role.",
    "Run local interviews across user, buyer, distribution, procurement, and regulatory roles."
  ),
  "partner-shortfall": q(
    "Has a partner missed a volume or schedule commitment, and how did you respond?",
    ["We have no partner or it is too early to assess.", "We do not formally track whether commitments are met.", "We track delivery against commitments.", "We have a response process and have used it when a commitment was missed."],
    "Describe a missed commitment and the action you took.",
    "Review partner pipeline and sales commitments on a regular cadence."
  ),
  "partner-cold-check": q(
    "Beyond warm introductions, have you listened to prospective customers who are not buying?",
    ["We have met only people introduced through our network.", "We know we should, but have not met them.", "We heard from non-buyers and people with a cold response.", "We categorized the reasons and changed the offering or sales approach."],
    "List the reasons people gave for not buying.",
    "Collect feedback from cold prospects and customers who chose not to buy."
  ),
  "plan-hypothesis-kpi": q(
    "Have you defined what you are testing in the target market and which metrics will tell you whether it worked?",
    ["We have not defined it.", "We are still deciding what to measure.", "We defined a hypothesis and metrics.", "We review those metrics regularly and use them to make decisions."],
    "Enter the hypothesis, leading indicators, and lagging indicators.",
    "Define the current-stage hypothesis and its leading and lagging indicators."
  ),
  "plan-stop-rule": q(
    "Have you set a numeric threshold for stopping further investment if results do not materialize?",
    ["We have not set one.", "We know we need one but have not set a number.", "We defined the metric, threshold, and period.", "Leadership approved and documented the rule."],
    "State the metric, threshold, and time period that would stop investment.",
    "Define the metric, threshold, and period that will stop further investment."
  ),
  "plan-single-tracker": q(
    "Do you track global expansion goals, results, forecasts, owners, and next decisions in one place?",
    ["We do not have a tracker.", "The information is scattered across documents and messages.", "We track it in one place.", "We use that tracker to make decisions in a recurring meeting."],
    "Name the tracker and what it contains.",
    "Track goals, actuals, forecasts, owners, and the next decision date in one place."
  ),
  "plan-change-control": q(
    "When you localize an offering or policy, is it clear who approves the change and who can roll it back?",
    ["We have not defined this.", "We discuss each change as it comes up.", "We have version, owner, and approval rules.", "We have successfully rolled back a change."],
    "Describe the approval and rollback process.",
    "Create version-control, approval, and rollback procedures for localization changes."
  ),
  "org-single-owner": q(
    "Is one person ultimately accountable for revenue and profit in the target market?",
    ["No one is assigned.", "Several people share responsibility.", "One person is accountable.", "That person owns the P&L and has matching decision authority."],
    "Identify the person and the full scope of their accountability.",
    "Assign one person final accountability for target-market revenue and profit."
  ),
  "org-continuity": q(
    "Can the expansion continue if a key team member becomes unavailable?",
    ["We have not considered this.", "The work would probably stop without that person.", "A backup person or process is defined.", "The work continued successfully during an actual absence."],
    "Describe who takes over and how.",
    "Define a backup owner and handoff process for each key role."
  ),
  "org-decision-cases": q(
    "For recent pricing, quality, or regulatory issues, do you know who made the decision and who approved it?",
    ["We have not faced such a case.", "It varies by situation and is not defined.", "The decision maker and approver are clear in recent cases.", "The documented process matches how decisions are actually made."],
    "Describe a recent case and identify the decision maker and approver.",
    "Record the actual decision maker and approver for pricing, quality, regulatory, and compensation decisions."
  ),
  "org-local-authority": q(
    "Does the local lead have defined decisions and spending limits that do not require headquarters approval?",
    ["We do not have a local lead.", "Headquarters makes every decision.", "The local lead can decide some items.", "The items and limits are defined and used in practice."],
    "List the decisions and spending limits delegated locally.",
    "Define the decisions and spending limits the local lead may exercise independently."
  ),
  "org-escalation": q(
    "When an urgent local issue occurs, is it clear who must be notified and how quickly?",
    ["No escalation path is defined.", "We contact whoever is available.", "The recipient and response time are defined.", "The path has worked in a real incident."],
    "Describe the route and timing for urgent and routine issues.",
    "Define escalation recipients and response times for urgent and routine issues."
  ),
  "contract-control": q(
    "Does the partner agreement protect your company on exclusivity, data, pricing, brand use, and termination?",
    ["We have not signed an agreement.", "We used the partner's standard form without material changes.", "We reviewed and included exclusivity, data, pricing, and termination terms.", "A qualified expert reviewed the final clauses."],
    "Summarize the relevant clauses; do not upload the original agreement.",
    "Include exclusivity, data, pricing, brand, and termination protections in the partner agreement."
  ),
  "contract-exit": q(
    "If the partner relationship ends, can your company retain the customers acquired through it?",
    ["We have not considered this.", "It may be difficult, but we have not confirmed.", "The contract or operating setup allows us to retain them.", "We directly control the customer list and customer contracts."],
    "State who owns the customer list and contracts.",
    "Add a contractual process for transferring customers and operations when the partnership ends."
  ),
  "contract-switch-cost": q(
    "Do you know how long and how much it would take to replace the current partner?",
    ["We have not considered it.", "We know replacement would be difficult but have no estimate.", "We identified alternatives and estimated time and cost.", "We contacted or tested an alternative."],
    "Enter the estimated switching time and cost.",
    "Identify alternative partners and estimate the time and cost to switch."
  ),
  "contract-dependency-limit": q(
    "Have you defined how much dependence on any one partner is acceptable?",
    ["We have not considered it.", "We know concentration is high but have no threshold.", "We set a dependency limit.", "We defined and execute actions when the limit is exceeded."],
    "Enter the current dependency level and the allowed limit.",
    "Set a single-partner dependency limit and the action required when it is exceeded."
  ),
  "alloc-milestone-budget": q(
    "Are the conditions for releasing the next tranche of budget tied to specific milestones?",
    ["We have not defined them.", "We decide whenever funding is needed.", "Each milestone is tied to a budget amount.", "We have released or withheld budget using those rules."],
    "List the milestones and the budget tied to each one.",
    "Define the milestone conditions that release each tranche of budget."
  ),
  "alloc-capacity": q(
    "If orders rise suddenly, do you know whether production, systems, or staffing will become the first bottleneck?",
    ["We have not considered it.", "We have an assumption but have not tested it.", "We know which process, system, or role will constrain growth first.", "We have experienced the constraint or run a load test."],
    "Identify the first bottleneck and the evidence behind it.",
    "Identify the process, system, or role most likely to fail first under a demand spike."
  ),
  "alloc-conditional-limit": q(
    "Have you capped the budget you will spend while results remain uncertain?",
    ["We have not set a cap.", "We know we need one but have not set a number.", "We set limits for budget, time, and customer scope.", "We have applied those limits to an experiment or market entry."],
    "Enter the limits for budget, time, and customer scope.",
    "Set budget, time, and customer-scope limits for continued investment under uncertainty."
  ),
  "alloc-concentration": q(
    "Do you monitor whether revenue is becoming too concentrated in one customer or channel?",
    ["We do not monitor concentration.", "We know it is concentrated but have no threshold.", "We set and monitor an acceptable share.", "We have taken risk-mitigation action after exceeding the limit."],
    "Enter the current share of the largest customer or channel and the allowed limit.",
    "Set dependency limits and risk-mitigation actions for any single customer, channel, or supplier."
  )
};

export const V5_EN_QUESTION_TEXT: Record<string, string> = {
  "mvc-purpose-alignment": "Are the CEO and leadership team aligned on why the company is expanding globally?",
  "mvc-resource-priority": "Do you have an agreed rule for allocating people and budget between domestic operations and global expansion?",
  "mvc-reference-market": "Have you selected an initial target market in which to test whether the offering's value resonates with global customers?",
  "res-tce": "Have you calculated the total cost of entry, including certification, localization, people, legal, and logistics costs?",
  "res-cash-runway": "Have you calculated how many months the company can operate on its own cash if local revenue is delayed?",
  "res-no-grant-scope": "Have you defined the minimum market-entry scope that can be executed without government funding?",
  "res-owner-time": "Have you named the person accountable for global expansion and set their weekly time commitment?",
  "pmf-paid-conversion": "What is the strongest evidence you have today that a customer has paid?",
  "pmf-churn-cases": "Have you directly confirmed why interested prospects dropped out?",
  "pmf-buying-roles": "Have you distinguished and confirmed the actual user, payer, decision-maker, and approver?",
  "pmf-customer-words": "Have you asked people who selected or rejected the offering why they made that choice?",
  "mkt-icp-count": "Have you counted the prospects or customer accounts you can actually reach in the initial target market, using a named list and sources?",
  "mkt-country-compare": "Have you compared candidate countries on the same criteria—market potential, entry cost, regulation, and customer access—and ranked them?",
  "bmlc-classification": "Have you verified the offering's legal classification in the initial target country using official sources?",
  "bmlc-preconditions": "Have you identified the approvals and certifications required before selling in the initial target country?",
  "bmlc-na-basis": "Have you determined whether each regulatory requirement applies and recorded the basis for that decision?",
  "bmlc-local-practice": "Have you confirmed how price display, contracting, payment, and settlement practices in the initial target country differ from domestic practice?",
  "lpa-net-price": "Have you calculated net revenue and margin after taxes, fees, currency-conversion costs, and partner commissions?",
  "lpa-infra-partner": "Have you selected candidate logistics, payment, and cloud providers for the initial target country?",
  "lpa-bridge-person": "Do you have a person who understands both local conditions and the offering and can connect headquarters with the local market?",
  "lpa-journey-blocker": "Have you directly observed where local customers stall or drop off across discovery, comparison, purchase, payment, use, and support?",
  "test-environment": "Have you tested whether the offering works under actual conditions in the initial target country?",
  "test-defects": "Do you record product, service, and customer-journey issues found in local testing and track their resolution?",
  "test-message-worked": "Have you identified which local promotion message or product demonstration actually generated inquiries?",
  "test-no-discount": "Has a customer paid, without discounts or free offers, at a price that preserves your target margin?",
  "test-counter-evidence": "Have you identified evidence that contradicts the market hypothesis—such as rejection, churn, non-conversion, or usage failure—and reflected it in the plan?",
  "partner-actual-work": "Is the local partner actually performing its assigned role?",
  "partner-economics": "Have you compared the profitability of partner-led and direct sales using numbers?",
  "partner-ecosystem-interviews": "Have you directly confirmed the input or requirements of different local stakeholders, including users, buyers, distributors, procurement, and regulators?",
  "partner-shortfall": "Do you regularly review whether the partner meets committed volumes and schedules, and have you set actions for shortfalls?",
  "partner-cold-check": "Have you directly sought input from prospects outside your referral network and prospects who chose not to buy?",
  "plan-hypothesis-kpi": "Have you defined the hypothesis to test in the initial target market and the metrics used to judge it?",
  "plan-stop-rule": "Have you set numeric criteria for stopping further investment when performance falls short?",
  "plan-single-tracker": "Do you manage global-expansion objectives, performance, and owners in one place?",
  "plan-change-control": "Have you named the approver for localization changes and the owner responsible for recovery if a change causes problems?",
  "org-single-owner": "Is one person ultimately accountable for revenue and profit in the initial target market?",
  "org-continuity": "Can global-expansion work continue when a key team member is absent?",
  "org-local-authority": "Have you defined which decisions and spending limits the local owner can approve without headquarters?",
  "org-escalation": "When an urgent local issue occurs, have you defined who must be notified and within how many hours?",
  "contract-control": "Does the partner contract cover exclusivity, data, pricing, termination, and customer transfer in a way that protects the business?",
  "contract-exit": "Can the company retain the customers it acquired after the partner contract ends?",
  "contract-switch-cost": "Have you estimated the time and cost required to replace the partner and identified alternatives?",
  "contract-dependency-limit": "Have you set limits on how much sales, customer data, and operations may depend on one partner, along with fallback actions?",
  "alloc-milestone-budget": "Have you defined the achievement criteria required before the next budget is released?",
  "alloc-capacity": "Have you identified which of production, systems, people, or supply will reach its limit first as launch or pilot demand grows?",
  "alloc-concentration": "If you have revenue, have you measured whether it is overly concentrated in specific customers or channels and set mitigation thresholds?"
};

export const V5_EN_DETAIL_OVERRIDES: Partial<Record<string, Partial<QuestionCopy>>> = {
  "mvc-resource-priority": {
    options: ["We have not yet thought about a priority rule", "We feel the need but have not set a rule", "We set a priority rule and shared it in writing or in meetings", "We have made repeated allocation decisions by that rule"],
    followUp: "Describe the rule and your most recent allocation decision."
  },
  "pmf-paid-conversion": {
    options: ["We have no paid-customer evidence yet", "We have interest, inquiries, or free usage, but no paid conversion", "We completed a domestic paid sale or a paid PoC or pilot in the initial target country", "Repeat purchases, renewals, or usage growth recur across customers at home or abroad"],
    followUp: "List your strongest evidence in order. Anonymize customers as \"Customer A.\""
  },
  "pmf-buying-roles": {
    options: ["We have not yet distinguished these roles", "We can guess, but have not confirmed them in real deals", "We confirmed user, payer, decision-maker, and approver in recent deals", "We confirm the four roles across multiple deals and use them to tailor our approach"],
    followUp: "For a recent deal, name who held each of the four roles."
  },
  "mkt-icp-count": {
    options: ["We have not counted yet", "We only estimated from market-size reports or industry statistics", "We counted directly from named lists, channels, or account data", "We keep the list current and use it for actual outreach"],
    followUp: "State the count, its source, and the as-of date.",
    action: "Count reachable accounts in the initial target country and record the list, source, and as-of date."
  },
  "mkt-country-compare": {
    options: ["We are looking at one country only and have not compared", "We looked at several countries but not on the same criteria", "We compared on the same criteria and set priorities", "We verified the ranking holds even without personal ties or subsidies"],
    followUp: "State your criteria, top ranking, and whether it changes without incidental advantages.",
    action: "Compare candidate countries on the same criteria and confirm whether the ranking holds without incidental advantages."
  },
  "bmlc-na-basis": {
    options: ["We have not reviewed regulatory requirements yet", "We sorted applicability by internal judgment only, without supporting evidence", "We recorded whether each requirement applies and the basis for the decision", "We confirmed applicability and its basis with an expert or regulator"],
    followUp: "List the applicability decision and basis for each key requirement."
  },
  "bmlc-local-practice": {
    options: ["We have not looked into this yet", "We have only a rough picture from desk research", "We confirmed the differences directly with local customers or partners", "We have transacted under those practices in real quotes, contracts, or settlements"],
    followUp: "Describe the practices that differed from home.",
    action: "Confirm local differences in price display, contracting, payment methods, and settlement cycles."
  },
  "lpa-net-price": {
    options: ["We have not calculated this yet", "We have a rough sense but no line-item calculation", "We calculated net revenue and margin line by line", "We verified the calculation against real settlements"],
    followUp: "List the deductions and the remaining margin."
  },
  "lpa-journey-blocker": {
    options: ["No local customer has gone through the journey yet", "Customers have used it, but we did not observe where they stall", "We directly observed stall and friction points at each journey step", "We fixed observed points and verified the improvement"],
    followUp: "Describe the friction, step by step."
  },
  "test-defects": {
    options: ["We have not tested locally, so there is nothing to record", "We tested but did not record the issues", "We record issues and journey friction and track their resolution", "We repeatedly analyze root causes and prevent recurrence"],
    followUp: "List recorded issues and what remains unresolved."
  },
  "test-no-discount": {
    options: ["We have no paid deals yet", "We have transactions, but they rely on discounts or free offers or do not preserve our target margin", "A customer has paid without discounts or free offers at a price that preserves our target margin", "Paid transactions under the same pricing conditions recur across multiple customers"],
    followUp: "Describe the paid transaction and pricing terms that preserved the target margin."
  },
  "test-counter-evidence": {
    options: ["We have not looked from that angle", "We sense warning signs but have not confirmed them as evidence", "We confirmed and recorded contradicting evidence", "We revised our hypothesis or plan based on that evidence"],
    followUp: "Describe the evidence and what you changed.",
    action: "Record evidence that contradicts the market hypothesis and reflect it in the hypothesis and plan."
  },
  "partner-shortfall": {
    options: ["We do not yet have an active partner whose delivery can be reviewed", "We have volume or schedule commitments but do not review delivery regularly", "We regularly review delivery against committed volume and schedules", "We have shortfall thresholds and apply defined actions based on review results"],
    followUp: "State the review cadence, shortfall thresholds, and response actions."
  },
  "contract-control": {
    options: ["We have not signed a partner contract yet", "We have a contract, but on the partner's standard terms", "We reviewed the five terms and reflected them in the contract", "We finalized the protective clauses with expert review"],
    followUp: "Summarize the clauses. Do not attach the contract itself."
  },
  "contract-dependency-limit": {
    options: ["We have not thought about this yet", "We know the dependency is high but have not set a limit", "We set dependency limits and fallbacks for sales, customer data, and operations", "We review the limits and fallbacks regularly and have verified an alternative route"],
    followUp: "State current dependency, the limit, and the fallback."
  },
  "alloc-capacity": {
    options: ["We have not thought about this yet", "We can guess but have not verified", "We have identified which point hits its limit first", "We verified it through real demand growth or load testing"],
    followUp: "Name the first bottleneck and your evidence."
  },
  "alloc-concentration": {
    options: ["We have not looked at concentration", "We know it is concentrated but have not measured it or set thresholds", "We measure revenue share by customer and channel and set mitigation thresholds", "We update revenue concentration by customer and channel regularly and review actions that can be taken before a threshold is breached"],
    followUp: "State the largest customer or channel share and your thresholds."
  }
};
