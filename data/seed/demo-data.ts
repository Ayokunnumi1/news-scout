// Demo data for three FICTIONAL financial institutions and a fictional
// regulator ("National Banking Supervisory Authority"). Any resemblance to
// real institutions is unintended. Seeded analyses are written in the exact
// shape the AI returns and pass through the same guardrails and risk engine
// as live analyses (see scripts/seed.ts).

import type { ClaimAnalysisOutput } from "@/lib/ai/schemas";
import type { Platform, ResponseStatus, SourceType, TrustLevel } from "@/types/domain";

export interface SeedBank {
  key: string;
  name: string;
  slug: string;
  description: string;
}

export interface SeedSource {
  bank: string;
  key: string;
  name: string;
  source_type: SourceType;
  url: string | null;
  trust_level: TrustLevel;
  active: boolean;
  content: string;
}

/** Evidence in seed data cites a source by its seed key instead of an S-ref. */
type SeedAnalysis = Omit<ClaimAnalysisOutput, "evidence"> & {
  evidence: (Omit<ClaimAnalysisOutput["evidence"][number], "source_ref"> & { source: string })[];
};

export interface SeedPost {
  bank: string;
  key: string;
  platform: Platform;
  author: string;
  author_handle: string;
  content: string;
  source_url: string | null;
  hoursAgo: number;
  engagement_count: number;
  analysis?: SeedAnalysis;
  response?: {
    status: ResponseStatus;
    reviewer?: string;
    public_response: string;
    internal_communication: string;
    recommended_action: string;
    edited_public_response?: string;
  };
}

export const SEED_BANKS: SeedBank[] = [
  {
    key: "aurelia",
    name: "Aurelia Trust Bank",
    slug: "aurelia-trust",
    description: "Fictional mid-size retail and commercial bank with 140 branches. Demo institution.",
  },
  {
    key: "kestrel",
    name: "Kestrel Federal Savings",
    slug: "kestrel-federal",
    description: "Fictional savings and mortgage lender serving 1.2 million members. Demo institution.",
  },
  {
    key: "northwind",
    name: "Northwind Cooperative Bank",
    slug: "northwind-coop",
    description: "Fictional member-owned cooperative bank focused on community lending. Demo institution.",
  },
];

export const SEED_SOURCES: SeedSource[] = [
  // ----------------------------------------------------------------- Aurelia
  {
    bank: "aurelia",
    key: "aurelia-q3",
    name: "Q3 2026 Financial Results",
    source_type: "OFFICIAL_PRESS_RELEASE",
    url: "https://aurelia-trust.example/press/q3-2026-results",
    trust_level: "HIGH",
    active: true,
    content:
      "Aurelia Trust Bank today reported results for the third quarter of 2026. Net profit was 412 million, up 6% year on year. The bank's Common Equity Tier 1 (CET1) ratio stood at 14.2%, and its liquidity coverage ratio was 148%, well above the regulatory minimum of 100%. Customer deposits grew 3% during the quarter. All branches and digital channels operated normally throughout the quarter. The bank continues to evaluate opportunities to grow its commercial lending business organically.",
  },
  {
    bank: "aurelia",
    key: "aurelia-outage",
    name: "Service Status Statement – 4 October 2026",
    source_type: "OFFICIAL_WEBSITE",
    url: "https://aurelia-trust.example/service-status",
    trust_level: "HIGH",
    active: true,
    content:
      "On 4 October 2026 between 08:10 and 10:45 local time, some customers experienced delays when logging in to the Aurelia mobile app due to a fault at a third-party authentication provider. No customer data was accessed or compromised. Card payments, ATMs and online banking on desktop were not affected. Service was fully restored at 10:45. We apologise for the inconvenience.",
  },
  {
    bank: "aurelia",
    key: "aurelia-overdraft",
    name: "Overdraft Changes – Customer Notice",
    source_type: "OFFICIAL_WEBSITE",
    url: "https://aurelia-trust.example/notices/overdraft-changes",
    trust_level: "HIGH",
    active: true,
    content:
      "From 1 November 2026, the arranged overdraft interest rate on Everyday Current Accounts will change from 19.9% to 21.9% EAR. The unarranged overdraft fee of 5 per month will be removed entirely. Customers will be notified in writing at least 30 days before the change. Accounts with an overdraft buffer of 50 will continue to pay no interest on the first 50 borrowed.",
  },
  {
    bank: "aurelia",
    key: "aurelia-register",
    name: "NBSA Register Entry – Aurelia Trust Bank",
    source_type: "REGULATORY_STATEMENT",
    url: "https://nbsa.example/register/aurelia-trust-bank",
    trust_level: "HIGH",
    active: true,
    content:
      "Aurelia Trust Bank is authorised and supervised by the National Banking Supervisory Authority (NBSA). As of 30 September 2026, there are no open enforcement actions against the firm. Eligible deposits are protected by the National Deposit Guarantee Scheme up to 100,000 per depositor.",
  },
  {
    bank: "aurelia",
    key: "aurelia-archived",
    name: "Archived: 2024 Branch Network Review",
    source_type: "OFFICIAL_PRESS_RELEASE",
    url: "https://aurelia-trust.example/press/2024-branch-review",
    trust_level: "MEDIUM",
    active: false,
    content:
      "Aurelia Trust Bank will consolidate 12 branches during 2024 where nearby branches are within two miles. Affected customers will receive at least 12 weeks' notice. (Archived — superseded by later announcements.)",
  },
  // ----------------------------------------------------------------- Kestrel
  {
    bank: "kestrel",
    key: "kestrel-rates",
    name: "Mortgage Rate Update – September 2026",
    source_type: "OFFICIAL_PRESS_RELEASE",
    url: "https://kestrel-federal.example/news/mortgage-rate-update",
    trust_level: "HIGH",
    active: true,
    content:
      "Kestrel Federal Savings will reduce its standard variable mortgage rate from 6.49% to 6.24%, effective 15 September 2026. Existing fixed-rate mortgages are unaffected until the end of their fixed term. Kestrel does not charge early repayment fees on its standard variable rate.",
  },
  {
    bank: "kestrel",
    key: "kestrel-incident",
    name: "Data Security Incident Notice",
    source_type: "OFFICIAL_WEBSITE",
    url: "https://kestrel-federal.example/security/incident-notice",
    trust_level: "HIGH",
    active: true,
    content:
      "On 22 September 2026 Kestrel Federal Savings identified unauthorised access to a marketing email list held by an external vendor. The list contained names and email addresses of approximately 4,800 customers. No account numbers, passwords, balances or transaction data were included. Affected customers have been contacted directly. Kestrel will never ask customers to confirm their password or one-time passcode by email, text message or phone.",
  },
  {
    bank: "kestrel",
    key: "kestrel-capital",
    name: "NBSA Capital Adequacy Disclosure",
    source_type: "REGULATORY_STATEMENT",
    url: "https://nbsa.example/disclosures/kestrel-federal-savings",
    trust_level: "HIGH",
    active: true,
    content:
      "Kestrel Federal Savings reported a total capital ratio of 17.8% as at 30 June 2026, above the minimum requirement of 10.5%. The firm remains in good standing with the National Banking Supervisory Authority.",
  },
  {
    bank: "kestrel",
    key: "kestrel-interview",
    name: "The Ledger Daily – Interview with Kestrel CEO",
    source_type: "APPROVED_NEWS_SOURCE",
    url: "https://ledger-daily.example/interviews/kestrel-ceo",
    trust_level: "MEDIUM",
    active: true,
    content:
      "In an interview with The Ledger Daily, Kestrel chief executive Maria Delgado said the society would open four new branches in 2027 and has no plans to close existing branches. She said the society's savings rates are reviewed monthly and that its current best easy-access rate is 4.1%.",
  },
  // --------------------------------------------------------------- Northwind
  {
    bank: "northwind",
    key: "northwind-dividend",
    name: "Member Dividend Announcement 2026",
    source_type: "OFFICIAL_PRESS_RELEASE",
    url: "https://northwind-coop.example/news/member-dividend-2026",
    trust_level: "HIGH",
    active: true,
    content:
      "Northwind Cooperative Bank will pay a member dividend of 1.5% on qualifying savings balances for the 2026 financial year, payable on 31 January 2027. The dividend is subject to approval at the Annual General Meeting on 12 December 2026.",
  },
  {
    bank: "northwind",
    key: "northwind-cards",
    name: "Card Payment Disruption Update – 7 October 2026",
    source_type: "OFFICIAL_WEBSITE",
    url: "https://northwind-coop.example/service-updates/card-disruption",
    trust_level: "HIGH",
    active: true,
    content:
      "On 7 October 2026 a fault at our card processing partner caused some debit card payments to be declined between 17:30 and 19:10. Any duplicate or failed transactions will be automatically reversed within 3 working days. Customers who incurred charges as a direct result can contact us for a refund. The issue has been resolved.",
  },
  {
    bank: "northwind",
    key: "northwind-resolution",
    name: "NBSA Statement on Cooperative Bank Resolution Planning",
    source_type: "REGULATORY_STATEMENT",
    url: "https://nbsa.example/statements/cooperative-resolution-planning",
    trust_level: "HIGH",
    active: true,
    content:
      "The National Banking Supervisory Authority has published resolution plans for all cooperative banks as part of its routine annual review. Publication of a resolution plan does not indicate that a bank is in financial difficulty. Resolution planning is a standard requirement for all authorised deposit-takers.",
  },
  {
    bank: "northwind",
    key: "northwind-fund",
    name: "Northwind Community Fund Report 2025",
    source_type: "OFFICIAL_WEBSITE",
    url: "https://northwind-coop.example/community/fund-report-2025",
    trust_level: "MEDIUM",
    active: true,
    content:
      "In 2025 the Northwind Community Fund awarded 2.1 million in grants to 340 local charities and community groups, funded by 1% of the bank's annual profit.",
  },
];

const noImpact = { level: "NONE" as const, description: "" };

export const SEED_POSTS: SeedPost[] = [
  // =============================================================== AURELIA
  {
    bank: "aurelia",
    key: "aurelia-bankrun",
    platform: "X",
    author: "Money Truth Now",
    author_handle: "@MoneyTruthNow",
    content:
      "BREAKING: Aurelia Trust Bank is about to go under. Insiders say they'll freeze ALL withdrawals by Friday. GET YOUR MONEY OUT NOW before it's too late!!! #bankrun",
    source_url: "https://x.example/MoneyTruthNow/status/1",
    hoursAgo: 46,
    engagement_count: 48_200,
    analysis: {
      institution: "Aurelia Trust Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Aurelia Trust Bank is insolvent and will freeze all customer withdrawals by Friday.",
      secondary_claims: [
        "Unnamed insiders have confirmed a withdrawal freeze.",
        "Customers should withdraw their money immediately.",
      ],
      entities: ["Aurelia Trust Bank", "@MoneyTruthNow"],
      financial_impact: {
        level: "HIGH",
        description: "A believed insolvency rumour could trigger large deposit outflows.",
      },
      customer_impact: { level: "HIGH", description: "All depositors are targeted with a call to withdraw funds." },
      claim_severity: { level: "SEVERE", rationale: "Solvency and bank-run claim." },
      urgency: { level: "HIGH", rationale: "Explicit deadline and call to action; high and growing engagement." },
      emotional_language: ["GET YOUR MONEY OUT NOW", "before it's too late", "about to go under"],
      misinformation_indicators: [
        "Anonymous 'insiders' as the only source",
        "Artificial urgency and deadline",
        "Bank-run hashtag",
      ],
      observed_facts: [
        "The post states Aurelia will freeze all withdrawals by Friday.",
        "Q3 2026 Financial Results states the liquidity coverage ratio was 148%.",
        "The NBSA register states there are no open enforcement actions against the firm.",
      ],
      ai_inferences: [
        "The post appears designed to provoke panic withdrawals.",
        "No evidence in the trusted sources suggests liquidity stress.",
      ],
      evidence: [
        {
          source: "aurelia-q3",
          relevant_statement: "its liquidity coverage ratio was 148%, well above the regulatory minimum of 100%",
          relationship: "CONTRADICTS",
          summary: "Strong reported liquidity is inconsistent with imminent insolvency.",
          confidence: 90,
        },
        {
          source: "aurelia-q3",
          relevant_statement: "Customer deposits grew 3% during the quarter.",
          relationship: "CONTRADICTS",
          summary: "Deposits were growing, not fleeing, in the latest reported quarter.",
          confidence: 75,
        },
        {
          source: "aurelia-register",
          relevant_statement: "there are no open enforcement actions against the firm",
          relationship: "NEUTRAL",
          summary: "No regulatory action is recorded, but this does not directly address withdrawals.",
          confidence: 60,
        },
      ],
      classification: "FALSE",
      confidence: 91,
      reasoning_summary:
        "The post claims imminent insolvency and a withdrawal freeze. The bank's Q3 results report a 148% liquidity coverage ratio and growing deposits, which directly contradict an imminent collapse. The only support offered is anonymous 'insiders'.",
      recommended_action:
        "Issue a calm factual statement citing published liquidity figures and request platform review of the post.",
      requires_human_review: true,
    },
    response: {
      status: "APPROVED",
      reviewer: "Elena Marsh (Head of Communications)",
      public_response:
        "We're aware of a post claiming Aurelia Trust Bank will freeze withdrawals. This is not correct. Our latest published results show a liquidity coverage ratio of 148%, and all branches and digital channels are operating normally.",
      internal_communication:
        "A post on X (48k engagements) falsely claims Aurelia is insolvent and will freeze withdrawals by Friday. Q3 2026 results contradict this (LCR 148%, deposits +3%). Risk: CRITICAL. Proposed: publish the approved holding statement on official channels, brief branch and contact-centre staff, and submit the post for platform review under misinformation policy.",
      recommended_action:
        "Publish approved statement, brief frontline staff, and file a platform review request for the original post.",
    },
  },
  {
    bank: "aurelia",
    key: "aurelia-outage-hack",
    platform: "FACEBOOK",
    author: "Linda Okafor",
    author_handle: "linda.okafor",
    content:
      "Aurelia's app was down for HOURS this morning and they're not saying anything. I bet hackers got in and stole everyone's data. Change your passwords people!",
    source_url: "https://facebook.example/posts/2",
    hoursAgo: 5 * 24 + 3,
    engagement_count: 3_100,
    analysis: {
      institution: "Aurelia Trust Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Aurelia's mobile app outage was caused by hackers who stole customer data.",
      secondary_claims: ["The app was down for hours.", "Aurelia has not communicated about the outage."],
      entities: ["Aurelia Trust Bank"],
      financial_impact: { level: "MEDIUM", description: "Breach fears may drive account closures." },
      customer_impact: { level: "HIGH", description: "Suggests all customers' data is compromised." },
      claim_severity: { level: "HIGH", rationale: "Alleges a data breach." },
      urgency: { level: "MEDIUM", rationale: "Moderate engagement; speculative tone." },
      emotional_language: ["down for HOURS", "stole everyone's data"],
      misinformation_indicators: [
        "Speculation presented as likely ('I bet')",
        "Generalises a login delay to a data theft",
      ],
      observed_facts: [
        "The Service Status Statement confirms login delays on the mobile app on 4 October between 08:10 and 10:45.",
        "The same statement says no customer data was accessed or compromised.",
      ],
      ai_inferences: ["The author appears to be speculating rather than reporting knowledge of a breach."],
      evidence: [
        {
          source: "aurelia-outage",
          relevant_statement: "some customers experienced delays when logging in to the Aurelia mobile app",
          relationship: "SUPPORTS",
          summary: "Confirms there was an app disruption.",
          confidence: 90,
        },
        {
          source: "aurelia-outage",
          relevant_statement: "No customer data was accessed or compromised.",
          relationship: "CONTRADICTS",
          summary: "Directly contradicts the data-theft claim.",
          confidence: 88,
        },
      ],
      classification: "MISLEADING",
      confidence: 84,
      reasoning_summary:
        "There was a real app login disruption on 4 October, so part of the post is accurate. However, the official status statement attributes it to a third-party authentication fault and states no customer data was accessed, contradicting the hacking claim.",
      recommended_action: "Reply with the service status facts and link customers to the official status page.",
      requires_human_review: true,
    },
    response: {
      status: "DRAFT",
      public_response:
        "Hi Linda, sorry for the disruption. On 4 October some customers had delays logging in to our app because of a fault at a third-party provider. No customer data was accessed or compromised, and service was fully restored at 10:45.",
      internal_communication:
        "Facebook post (3.1k engagements) links the 4 Oct app login disruption to a data breach. The official service status statement confirms the disruption but states no customer data was accessed. Risk: see investigation. Proposed: reply publicly with the factual update.",
      recommended_action: "Approve and post the reply; monitor comments for further breach speculation.",
    },
  },
  {
    bank: "aurelia",
    key: "aurelia-overdraft-news",
    platform: "NEWS",
    author: "The Ledger Daily",
    author_handle: "ledger-daily",
    content:
      "Aurelia Trust Bank will raise the arranged overdraft rate on its Everyday Current Account to 21.9% EAR from November, while scrapping its 5 monthly unarranged overdraft fee, according to a customer notice published this week.",
    source_url: "https://ledger-daily.example/banking/aurelia-overdraft",
    hoursAgo: 8 * 24,
    engagement_count: 950,
    analysis: {
      institution: "Aurelia Trust Bank",
      institution_matches_monitored_bank: true,
      primary_claim:
        "Aurelia will raise its arranged overdraft rate to 21.9% EAR from November and remove the 5 monthly unarranged overdraft fee.",
      secondary_claims: [],
      entities: ["Aurelia Trust Bank", "The Ledger Daily"],
      financial_impact: { level: "LOW", description: "Accurate reporting of a pricing change." },
      customer_impact: { level: "MEDIUM", description: "Affects overdraft users." },
      claim_severity: { level: "LOW", rationale: "Accurate product pricing news." },
      urgency: { level: "LOW", rationale: "Neutral tone, accurate." },
      emotional_language: [],
      misinformation_indicators: [],
      observed_facts: [
        "The customer notice states the rate will change from 19.9% to 21.9% EAR and the 5 fee will be removed.",
      ],
      ai_inferences: [],
      evidence: [
        {
          source: "aurelia-overdraft",
          relevant_statement:
            "the arranged overdraft interest rate on Everyday Current Accounts will change from 19.9% to 21.9% EAR",
          relationship: "SUPPORTS",
          summary: "Confirms the new rate.",
          confidence: 95,
        },
        {
          source: "aurelia-overdraft",
          relevant_statement: "The unarranged overdraft fee of 5 per month will be removed entirely.",
          relationship: "SUPPORTS",
          summary: "Confirms the fee removal.",
          confidence: 95,
        },
      ],
      classification: "TRUE",
      confidence: 95,
      reasoning_summary:
        "The article accurately reflects Aurelia's published overdraft notice on both the rate change and the fee removal.",
      recommended_action: "No intervention needed; keep the customer notice prominent.",
      requires_human_review: false,
    },
  },
  {
    bank: "aurelia",
    key: "aurelia-overdraft-x",
    platform: "X",
    author: "Fern",
    author_handle: "@frugal_fern",
    content: "Heard Aurelia is scrapping ALL overdraft fees next month?? Finally some good news lol",
    source_url: null,
    hoursAgo: 6 * 24 + 7,
    engagement_count: 210,
    analysis: {
      institution: "Aurelia Trust Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Aurelia is removing all overdraft fees next month.",
      secondary_claims: [],
      entities: ["Aurelia Trust Bank"],
      financial_impact: { level: "LOW", description: "Customers may borrow expecting no charges." },
      customer_impact: { level: "MEDIUM", description: "Overdraft users could be misled about costs." },
      claim_severity: { level: "MODERATE", rationale: "Misstates product pricing." },
      urgency: { level: "LOW", rationale: "Low reach, casual tone." },
      emotional_language: [],
      misinformation_indicators: ["Hearsay ('Heard')", "Overgeneralisation ('ALL')"],
      observed_facts: [
        "The customer notice says the 5 unarranged fee will be removed.",
        "The same notice says the arranged overdraft rate rises to 21.9% EAR.",
      ],
      ai_inferences: ["The author likely saw coverage of the fee removal without the rate increase."],
      evidence: [
        {
          source: "aurelia-overdraft",
          relevant_statement: "The unarranged overdraft fee of 5 per month will be removed entirely.",
          relationship: "SUPPORTS",
          summary: "One fee is being removed.",
          confidence: 90,
        },
        {
          source: "aurelia-overdraft",
          relevant_statement: "will change from 19.9% to 21.9% EAR",
          relationship: "CONTRADICTS",
          summary: "Overdraft borrowing becomes more expensive, so not all charges are going away.",
          confidence: 90,
        },
      ],
      classification: "MISLEADING",
      confidence: 82,
      reasoning_summary:
        "Only the 5 unarranged fee is being removed; the arranged overdraft interest rate is increasing. Saying all overdraft fees are scrapped omits key context.",
      recommended_action: "Monitor; a short clarifying reply is optional given low reach.",
      requires_human_review: true,
    },
  },
  {
    bank: "aurelia",
    key: "aurelia-acquisition",
    platform: "BLOG",
    author: "Fintech Whispers",
    author_handle: "fintechwhispers.blog",
    content:
      "Sources tell us Aurelia Trust Bank is in advanced talks to acquire a regional rival for around 2 billion. A deal could be announced within weeks.",
    source_url: "https://fintechwhispers.example/aurelia-deal",
    hoursAgo: 12 * 24,
    engagement_count: 1_800,
    analysis: {
      institution: "Aurelia Trust Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Aurelia Trust Bank is in advanced talks to acquire a regional rival for about 2 billion.",
      secondary_claims: ["A deal could be announced within weeks."],
      entities: ["Aurelia Trust Bank", "Fintech Whispers"],
      financial_impact: { level: "MEDIUM", description: "M&A rumours can move market and counterparty sentiment." },
      customer_impact: { level: "LOW", description: "Limited direct customer impact." },
      claim_severity: { level: "MODERATE", rationale: "Market-sensitive but not damaging in itself." },
      urgency: { level: "MEDIUM", rationale: "Market-sensitive information; may require a disclosure response." },
      emotional_language: [],
      misinformation_indicators: ["Unnamed sources", "Specific figure without attribution"],
      observed_facts: [
        "The Q3 results say the bank continues to evaluate opportunities to grow commercial lending organically.",
      ],
      ai_inferences: ["The trusted sources neither confirm nor rule out acquisition talks."],
      evidence: [
        {
          source: "aurelia-q3",
          relevant_statement:
            "The bank continues to evaluate opportunities to grow its commercial lending business organically.",
          relationship: "NEUTRAL",
          summary: "Mentions organic growth, which neither confirms nor denies acquisition talks.",
          confidence: 55,
        },
      ],
      classification: "UNVERIFIED",
      confidence: 40,
      reasoning_summary:
        "No trusted source addresses acquisition talks. The Q3 results mention organic growth, which does not settle the question. Absence of confirmation is not evidence the claim is false.",
      recommended_action: "Escalate to investor relations and legal for a 'no comment on market speculation' position.",
      requires_human_review: true,
    },
  },
  {
    bank: "aurelia",
    key: "aurelia-aml",
    platform: "INSTAGRAM",
    author: "City Life Finance",
    author_handle: "@citylifefinance",
    content:
      "Aurelia is being investigated by the regulator for money laundering, my cousin works there and says it's going to be huge 👀",
    source_url: "https://instagram.example/p/3",
    hoursAgo: 26,
    engagement_count: 7_600,
    analysis: {
      institution: "Aurelia Trust Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Aurelia Trust Bank is under regulatory investigation for money laundering.",
      secondary_claims: ["The investigation will be 'huge'."],
      entities: ["Aurelia Trust Bank", "the regulator"],
      financial_impact: {
        level: "HIGH",
        description: "AML allegations carry significant regulatory and funding consequences.",
      },
      customer_impact: { level: "MEDIUM", description: "Could undermine trust among depositors." },
      claim_severity: { level: "SEVERE", rationale: "Criminal/regulatory misconduct allegation." },
      urgency: { level: "MEDIUM", rationale: "Growing engagement, second-hand claim." },
      emotional_language: ["going to be huge"],
      misinformation_indicators: ["Second-hand 'my cousin works there' sourcing", "No documents or reporting cited"],
      observed_facts: [
        "The NBSA register states there are no open enforcement actions against the firm as of 30 September 2026.",
      ],
      ai_inferences: [
        "An investigation could exist without a published enforcement action, so the register does not disprove the claim.",
      ],
      evidence: [
        {
          source: "aurelia-register",
          relevant_statement: "As of 30 September 2026, there are no open enforcement actions against the firm.",
          relationship: "NEUTRAL",
          summary: "No enforcement action is public, but investigations are not necessarily published.",
          confidence: 60,
        },
      ],
      classification: "UNVERIFIED",
      confidence: 45,
      reasoning_summary:
        "The trusted sources do not mention any investigation. The regulator's register shows no open enforcement actions, but that does not rule out a non-public investigation, so the claim cannot be classified as false.",
      recommended_action: "Escalate internally to compliance to confirm the facts before any public comment.",
      requires_human_review: true,
    },
  },
  {
    bank: "aurelia",
    key: "aurelia-branches-pending",
    platform: "X",
    author: "Deal Hunter",
    author_handle: "@deal_hunter",
    content:
      "Aurelia branches all closing on Sunday for good? Someone in my group chat said so. Anyone know if this is real?",
    source_url: null,
    hoursAgo: 3,
    engagement_count: 640,
  },
  {
    bank: "aurelia",
    key: "aurelia-atm-pending",
    platform: "FACEBOOK",
    author: "Community Savers Group",
    author_handle: "communitysavers",
    content:
      "Aurelia is charging a new 10 fee for every ATM withdrawal starting next week. Absolute robbery. Share this so everyone knows!",
    source_url: "https://facebook.example/posts/4",
    hoursAgo: 6,
    engagement_count: 1_250,
  },
  // =============================================================== KESTREL
  {
    bank: "kestrel",
    key: "kestrel-hack",
    platform: "X",
    author: "Secure Money Alerts",
    author_handle: "@SecureMoneyAlerts",
    content:
      "WARNING: Kestrel Federal got HACKED. Every customer's bank account details and passwords are leaked on the dark web. Move your savings immediately!",
    source_url: "https://x.example/SecureMoneyAlerts/status/5",
    hoursAgo: 70,
    engagement_count: 21_500,
    analysis: {
      institution: "Kestrel Federal Savings",
      institution_matches_monitored_bank: true,
      primary_claim: "All Kestrel customers' account details and passwords were leaked on the dark web in a hack.",
      secondary_claims: ["Customers should move their savings immediately."],
      entities: ["Kestrel Federal Savings", "@SecureMoneyAlerts"],
      financial_impact: { level: "HIGH", description: "Could trigger mass withdrawals and fraud attempts." },
      customer_impact: { level: "HIGH", description: "Targets all customers; may also prime them for phishing." },
      claim_severity: { level: "SEVERE", rationale: "Alleged large-scale credential and account data breach." },
      urgency: { level: "HIGH", rationale: "Call to action and rapid spread." },
      emotional_language: ["WARNING", "HACKED", "Move your savings immediately"],
      misinformation_indicators: ["Exaggerates a limited vendor incident", "No evidence of dark-web listing provided"],
      observed_facts: [
        "Kestrel's incident notice describes unauthorised access to a vendor marketing list of names and email addresses for about 4,800 customers.",
        "The notice states no account numbers, passwords, balances or transaction data were included.",
      ],
      ai_inferences: ["The post appears to inflate a real but limited incident."],
      evidence: [
        {
          source: "kestrel-incident",
          relevant_statement: "No account numbers, passwords, balances or transaction data were included.",
          relationship: "CONTRADICTS",
          summary: "Directly contradicts the claim that account details and passwords leaked.",
          confidence: 92,
        },
        {
          source: "kestrel-incident",
          relevant_statement: "The list contained names and email addresses of approximately 4,800 customers.",
          relationship: "CONTRADICTS",
          summary: "The incident affected a limited subset, not every customer.",
          confidence: 85,
        },
        {
          source: "kestrel-capital",
          relevant_statement: "The firm remains in good standing with the National Banking Supervisory Authority.",
          relationship: "NEUTRAL",
          summary: "Context on overall standing; not directly about the incident.",
          confidence: 50,
        },
      ],
      classification: "FALSE",
      confidence: 88,
      reasoning_summary:
        "A real vendor incident exposed names and emails of about 4,800 customers, but Kestrel's official notice states no account numbers or passwords were included. The claim that every customer's account details and passwords leaked is contradicted.",
      recommended_action:
        "Publish a factual clarification, warn customers about phishing, and report the post as misleading under platform policy.",
      requires_human_review: true,
    },
    response: {
      status: "DRAFT",
      public_response:
        "We've seen claims that Kestrel customers' account details and passwords were leaked. This is not accurate. A September incident at an external vendor involved names and email addresses only; no account numbers, passwords or balances were included.",
      internal_communication:
        "High-reach X post (21.5k) claims all customer account details and passwords leaked. Our incident notice confirms only names/emails of ~4,800 customers via a vendor; no account data or passwords. Risk: CRITICAL. Proposed: publish clarification, add phishing warning to website banner, notify fraud team of potential phishing campaign, and report the post under misinformation policy.",
      recommended_action:
        "Approve clarification, coordinate phishing warning with fraud team, and file a platform policy report.",
    },
  },
  {
    bank: "kestrel",
    key: "kestrel-vendor-email",
    platform: "FACEBOOK",
    author: "Graham Whitlock",
    author_handle: "graham.whitlock",
    content:
      "Got an email from Kestrel saying my email address was part of some vendor breach. At least they told us. Anyone else get this?",
    source_url: null,
    hoursAgo: 9 * 24,
    engagement_count: 340,
    analysis: {
      institution: "Kestrel Federal Savings",
      institution_matches_monitored_bank: true,
      primary_claim: "Kestrel notified customers that their email addresses were exposed in a vendor breach.",
      secondary_claims: [],
      entities: ["Kestrel Federal Savings"],
      financial_impact: { level: "LOW", description: "Limited." },
      customer_impact: { level: "LOW", description: "Affected customers were already notified." },
      claim_severity: { level: "MODERATE", rationale: "Concerns a real data incident." },
      urgency: { level: "LOW", rationale: "Neutral, low reach." },
      emotional_language: [],
      misinformation_indicators: [],
      observed_facts: ["The incident notice states affected customers have been contacted directly."],
      ai_inferences: [],
      evidence: [
        {
          source: "kestrel-incident",
          relevant_statement: "Affected customers have been contacted directly.",
          relationship: "SUPPORTS",
          summary: "Confirms customers were notified.",
          confidence: 92,
        },
        {
          source: "kestrel-incident",
          relevant_statement: "unauthorised access to a marketing email list held by an external vendor",
          relationship: "SUPPORTS",
          summary: "Confirms a vendor-held email list was accessed.",
          confidence: 92,
        },
      ],
      classification: "TRUE",
      confidence: 93,
      reasoning_summary:
        "The post accurately describes the vendor incident notification described in Kestrel's official notice.",
      recommended_action: "No intervention needed; optionally thank the customer and link to the incident notice.",
      requires_human_review: false,
    },
  },
  {
    bank: "kestrel",
    key: "kestrel-rate-cut-news",
    platform: "NEWS",
    author: "Property Weekly",
    author_handle: "property-weekly",
    content: "Kestrel Federal Savings cuts its standard variable mortgage rate to 6.24% from 15 September.",
    source_url: "https://propertyweekly.example/kestrel-svr",
    hoursAgo: 24 * 24,
    engagement_count: 2_200,
    analysis: {
      institution: "Kestrel Federal Savings",
      institution_matches_monitored_bank: true,
      primary_claim: "Kestrel is cutting its standard variable mortgage rate to 6.24% from 15 September.",
      secondary_claims: [],
      entities: ["Kestrel Federal Savings", "Property Weekly"],
      financial_impact: noImpact,
      customer_impact: { level: "LOW", description: "Positive, accurate news." },
      claim_severity: { level: "LOW", rationale: "Accurate rate news." },
      urgency: { level: "LOW", rationale: "None." },
      emotional_language: [],
      misinformation_indicators: [],
      observed_facts: ["The rate update states the SVR will reduce from 6.49% to 6.24% effective 15 September 2026."],
      ai_inferences: [],
      evidence: [
        {
          source: "kestrel-rates",
          relevant_statement:
            "will reduce its standard variable mortgage rate from 6.49% to 6.24%, effective 15 September 2026",
          relationship: "SUPPORTS",
          summary: "Confirms the cut and date.",
          confidence: 97,
        },
      ],
      classification: "TRUE",
      confidence: 97,
      reasoning_summary: "The article matches the official mortgage rate update exactly.",
      recommended_action: "No action required.",
      requires_human_review: false,
    },
  },
  {
    bank: "kestrel",
    key: "kestrel-rate-rise-x",
    platform: "X",
    author: "Housing Hawk",
    author_handle: "@housing_hawk",
    content: "Kestrel just RAISED mortgage rates again while everyone else is cutting. Typical greedy lender.",
    source_url: "https://x.example/housing_hawk/status/6",
    hoursAgo: 15 * 24,
    engagement_count: 4_300,
    analysis: {
      institution: "Kestrel Federal Savings",
      institution_matches_monitored_bank: true,
      primary_claim: "Kestrel has raised its mortgage rates.",
      secondary_claims: ["Other lenders are cutting rates."],
      entities: ["Kestrel Federal Savings"],
      financial_impact: { level: "MEDIUM", description: "May deter new mortgage applicants." },
      customer_impact: { level: "MEDIUM", description: "Borrowers may be misinformed about their rate." },
      claim_severity: { level: "MODERATE", rationale: "Pricing misinformation with a reputational jab." },
      urgency: { level: "MEDIUM", rationale: "Moderate engagement." },
      emotional_language: ["RAISED", "Typical greedy lender"],
      misinformation_indicators: ["Contradicts published rate change", "Pejorative framing"],
      observed_facts: ["Kestrel's rate update states the SVR will reduce from 6.49% to 6.24%."],
      ai_inferences: ["The author may be confusing Kestrel with another lender."],
      evidence: [
        {
          source: "kestrel-rates",
          relevant_statement: "will reduce its standard variable mortgage rate from 6.49% to 6.24%",
          relationship: "CONTRADICTS",
          summary: "Kestrel reduced, not raised, its variable rate.",
          confidence: 93,
        },
      ],
      classification: "FALSE",
      confidence: 87,
      reasoning_summary:
        "Kestrel's most recent published change is a reduction of its standard variable rate, which contradicts the claim of a rise.",
      recommended_action: "Post a brief factual reply with the published rate change.",
      requires_human_review: true,
    },
    response: {
      status: "REJECTED",
      reviewer: "Tom Achebe (Compliance)",
      public_response:
        "Hi, Kestrel actually reduced its standard variable mortgage rate from 6.49% to 6.24% on 15 September 2026. Calling us greedy isn't fair.",
      internal_communication:
        "X post (4.3k) claims Kestrel raised mortgage rates. Published rate update shows a reduction to 6.24%. Proposed public reply attached.",
      recommended_action: "Reply with the published rate change.",
    },
  },
  {
    bank: "kestrel",
    key: "kestrel-branch-closures",
    platform: "BLOG",
    author: "SaverSense",
    author_handle: "saversense.blog",
    content: "Kestrel is quietly closing branches across the north — expect yours to be next.",
    source_url: "https://saversense.example/kestrel-branches",
    hoursAgo: 19 * 24,
    engagement_count: 900,
    analysis: {
      institution: "Kestrel Federal Savings",
      institution_matches_monitored_bank: true,
      primary_claim: "Kestrel is closing branches in the north and will close more.",
      secondary_claims: ["Further closures are coming to every area."],
      entities: ["Kestrel Federal Savings", "Maria Delgado"],
      financial_impact: { level: "LOW", description: "Limited." },
      customer_impact: { level: "MEDIUM", description: "Branch-reliant customers may worry about access." },
      claim_severity: { level: "MODERATE", rationale: "Service-access misinformation." },
      urgency: { level: "LOW", rationale: "Low reach blog post." },
      emotional_language: ["quietly", "expect yours to be next"],
      misinformation_indicators: ["No specific branches named", "Speculative extrapolation"],
      observed_facts: [
        "The CEO told The Ledger Daily the society has no plans to close existing branches and will open four new ones in 2027.",
      ],
      ai_inferences: ["The source is a medium-trust interview, so confidence is moderated."],
      evidence: [
        {
          source: "kestrel-interview",
          relevant_statement: "has no plans to close existing branches",
          relationship: "CONTRADICTS",
          summary: "CEO states there are no plans to close branches.",
          confidence: 75,
        },
        {
          source: "kestrel-interview",
          relevant_statement: "would open four new branches in 2027",
          relationship: "CONTRADICTS",
          summary: "Expansion plans are inconsistent with a closure programme.",
          confidence: 65,
        },
      ],
      classification: "FALSE",
      confidence: 70,
      reasoning_summary:
        "Kestrel's CEO stated in an approved news interview that there are no plans to close existing branches. The blog cites no specific closures. Confidence is moderated because the source is an interview rather than an official notice.",
      recommended_action: "Monitor; consider publishing branch network information on the official website.",
      requires_human_review: true,
    },
  },
  {
    bank: "kestrel",
    key: "kestrel-easy-saver",
    platform: "INSTAGRAM",
    author: "The Savvy Saver",
    author_handle: "@thesavvysaver",
    content:
      "Kestrel's new 'Easy Saver Plus' pays 7% interest!!! Limited spots — link in bio to sign up before it closes 💸",
    source_url: "https://instagram.example/p/7",
    hoursAgo: 30,
    engagement_count: 15_800,
    analysis: {
      institution: "Kestrel Federal Savings",
      institution_matches_monitored_bank: true,
      primary_claim:
        "Kestrel offers a new 'Easy Saver Plus' account paying 7% interest, available via a link in the author's bio.",
      secondary_claims: ["Places are limited."],
      entities: ["Kestrel Federal Savings", "Easy Saver Plus", "@thesavvysaver"],
      financial_impact: {
        level: "HIGH",
        description: "If a phishing lure, customers could lose funds or credentials.",
      },
      customer_impact: { level: "HIGH", description: "Large audience directed to a third-party link." },
      claim_severity: { level: "HIGH", rationale: "Possible impersonation/phishing using the brand." },
      urgency: { level: "HIGH", rationale: "Scarcity pressure and high engagement." },
      emotional_language: ["Limited spots", "before it closes"],
      misinformation_indicators: ["Unusually high rate", "Third-party sign-up link", "Scarcity pressure"],
      observed_facts: ["The CEO interview states Kestrel's current best easy-access rate is 4.1%."],
      ai_inferences: [
        "The offer resembles common investment-scam patterns.",
        "The trusted sources do not mention an 'Easy Saver Plus' product, so its existence cannot be confirmed or ruled out.",
      ],
      evidence: [
        {
          source: "kestrel-interview",
          relevant_statement: "its current best easy-access rate is 4.1%",
          relationship: "NEUTRAL",
          summary: "Suggests 7% is far above Kestrel's rates, but the interview may pre-date a new product.",
          confidence: 55,
        },
      ],
      classification: "UNVERIFIED",
      confidence: 50,
      reasoning_summary:
        "No trusted source mentions an 'Easy Saver Plus' product. The CEO interview cites a best easy-access rate of 4.1%, which makes 7% implausible but does not disprove a new product. The link-in-bio and scarcity pressure are common scam indicators.",
      recommended_action: "Escalate to fraud and product teams immediately to confirm whether the product exists.",
      requires_human_review: true,
    },
  },
  {
    bank: "kestrel",
    key: "kestrel-fine-pending",
    platform: "X",
    author: "Newsflash Finance",
    author_handle: "@newsflash_fin",
    content: "Kestrel Federal Savings fined 30 million by the regulator for mis-selling mortgages, per reports.",
    source_url: "https://x.example/newsflash_fin/status/8",
    hoursAgo: 4,
    engagement_count: 5_100,
  },
  {
    bank: "kestrel",
    key: "kestrel-otp-pending",
    platform: "FACEBOOK",
    author: "Joan Pryce",
    author_handle: "joan.pryce",
    content: "Kestrel texted me asking to confirm my one-time passcode to unlock my account. Is this real? Seems odd.",
    source_url: null,
    hoursAgo: 2,
    engagement_count: 85,
  },
  // ============================================================= NORTHWIND
  {
    bank: "northwind",
    key: "northwind-resolution-x",
    platform: "X",
    author: "Bank Watch Daily",
    author_handle: "@bankwatch_daily",
    content:
      "Northwind Coop is on the regulator's 'resolution' list — that means they're failing. Get your money out while you still can.",
    source_url: "https://x.example/bankwatch_daily/status/9",
    hoursAgo: 50,
    engagement_count: 12_900,
    analysis: {
      institution: "Northwind Cooperative Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Northwind's inclusion in the regulator's resolution planning means it is failing.",
      secondary_claims: ["Customers should withdraw their money."],
      entities: ["Northwind Cooperative Bank", "National Banking Supervisory Authority"],
      financial_impact: { level: "HIGH", description: "Could trigger withdrawals." },
      customer_impact: { level: "HIGH", description: "Directly urges members to withdraw." },
      claim_severity: { level: "SEVERE", rationale: "Solvency claim with a withdrawal call." },
      urgency: { level: "HIGH", rationale: "Call to action, strong engagement." },
      emotional_language: ["failing", "while you still can"],
      misinformation_indicators: ["Misinterprets a routine regulatory publication", "Call to withdraw funds"],
      observed_facts: [
        "The NBSA statement says resolution plans were published for all cooperative banks as part of a routine annual review.",
        "The statement says publication does not indicate financial difficulty.",
      ],
      ai_inferences: ["The author appears to misunderstand resolution planning."],
      evidence: [
        {
          source: "northwind-resolution",
          relevant_statement:
            "has published resolution plans for all cooperative banks as part of its routine annual review",
          relationship: "SUPPORTS",
          summary: "Confirms Northwind is covered by published resolution planning.",
          confidence: 90,
        },
        {
          source: "northwind-resolution",
          relevant_statement:
            "Publication of a resolution plan does not indicate that a bank is in financial difficulty.",
          relationship: "CONTRADICTS",
          summary: "Directly contradicts the inference that Northwind is failing.",
          confidence: 93,
        },
      ],
      classification: "MISLEADING",
      confidence: 90,
      reasoning_summary:
        "Northwind is indeed covered by the regulator's published resolution plans, but the regulator states this is routine for all cooperative banks and does not indicate financial difficulty. The post turns an accurate fact into a false conclusion.",
      recommended_action: "Publish a clarification quoting the regulator and request platform review.",
      requires_human_review: true,
    },
    response: {
      status: "APPROVED",
      reviewer: "Daniel Osei (Member Communications)",
      public_response:
        "The regulator publishes resolution plans for all cooperative banks as part of a routine annual review. As the regulator has stated, publication of a resolution plan does not indicate that a bank is in financial difficulty.",
      edited_public_response:
        "The regulator publishes resolution plans for all cooperative banks as part of a routine annual review. In its own words, publication of a resolution plan does not indicate that a bank is in financial difficulty. Members can find more on our website.",
      internal_communication:
        "X post (12.9k) claims Northwind is failing because it appears in NBSA resolution planning. NBSA states this is routine for all cooperative banks and does not indicate difficulty. Risk: CRITICAL. Proposed: publish clarification, brief member services, request platform review.",
      recommended_action: "Publish clarification and request platform review of the post.",
    },
  },
  {
    bank: "northwind",
    key: "northwind-card-declined",
    platform: "FACEBOOK",
    author: "Priya Raman",
    author_handle: "priya.raman",
    content:
      "My Northwind card got declined 3 times at the supermarket tonight and I was charged twice for petrol. Not happy.",
    source_url: null,
    hoursAgo: 60,
    engagement_count: 260,
    analysis: {
      institution: "Northwind Cooperative Bank",
      institution_matches_monitored_bank: true,
      primary_claim:
        "Northwind debit cards were declined and some transactions were charged twice on the evening of 7 October.",
      secondary_claims: [],
      entities: ["Northwind Cooperative Bank"],
      financial_impact: { level: "LOW", description: "Duplicate charges to be reversed." },
      customer_impact: { level: "MEDIUM", description: "Some cardholders affected for under two hours." },
      claim_severity: { level: "MODERATE", rationale: "Real service disruption." },
      urgency: { level: "MEDIUM", rationale: "Customer needs reassurance about refunds." },
      emotional_language: ["Not happy"],
      misinformation_indicators: [],
      observed_facts: [
        "Northwind's disruption update confirms declines between 17:30 and 19:10 and automatic reversal of duplicates.",
      ],
      ai_inferences: [],
      evidence: [
        {
          source: "northwind-cards",
          relevant_statement: "caused some debit card payments to be declined between 17:30 and 19:10",
          relationship: "SUPPORTS",
          summary: "Confirms the declines.",
          confidence: 94,
        },
        {
          source: "northwind-cards",
          relevant_statement:
            "Any duplicate or failed transactions will be automatically reversed within 3 working days.",
          relationship: "SUPPORTS",
          summary: "Confirms duplicates occurred and will be reversed.",
          confidence: 85,
        },
      ],
      classification: "TRUE",
      confidence: 92,
      reasoning_summary: "The customer's experience matches Northwind's published card disruption update.",
      recommended_action: "Reply with an apology and refund information.",
      requires_human_review: true,
    },
    response: {
      status: "DRAFT",
      public_response:
        "Hi Priya, we're sorry for the trouble. A fault at our card processing partner caused some payments to be declined on 7 October. Any duplicate transactions will be automatically reversed within 3 working days.",
      internal_communication:
        "Customer complaint (260 engagements) about declined card and duplicate charge on 7 Oct, consistent with the published card disruption. Proposed: public apology reply with reversal timeline; member services to follow up directly.",
      recommended_action: "Approve reply and ask member services to contact the customer directly.",
    },
  },
  {
    bank: "northwind",
    key: "northwind-dividend-cancel",
    platform: "X",
    author: "Coop Member 42",
    author_handle: "@coop_member_42",
    content:
      "Hearing Northwind is cancelling the member dividend this year to cover losses. So much for being member-owned.",
    source_url: "https://x.example/coop_member_42/status/10",
    hoursAgo: 4 * 24,
    engagement_count: 3_800,
    analysis: {
      institution: "Northwind Cooperative Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Northwind is cancelling this year's member dividend to cover losses.",
      secondary_claims: ["Northwind has made losses."],
      entities: ["Northwind Cooperative Bank"],
      financial_impact: { level: "MEDIUM", description: "May unsettle member confidence." },
      customer_impact: { level: "HIGH", description: "Affects all qualifying members' expectations." },
      claim_severity: { level: "HIGH", rationale: "Implies financial losses." },
      urgency: { level: "MEDIUM", rationale: "Moderate engagement." },
      emotional_language: ["So much for being member-owned"],
      misinformation_indicators: ["Hearsay ('Hearing')", "Unsupported claim of losses"],
      observed_facts: ["The dividend announcement states a 1.5% member dividend for 2026, subject to AGM approval."],
      ai_inferences: ["AGM approval is pending, so the dividend is announced but not yet final."],
      evidence: [
        {
          source: "northwind-dividend",
          relevant_statement:
            "will pay a member dividend of 1.5% on qualifying savings balances for the 2026 financial year",
          relationship: "CONTRADICTS",
          summary: "A dividend has been announced, not cancelled.",
          confidence: 90,
        },
        {
          source: "northwind-dividend",
          relevant_statement: "The dividend is subject to approval at the Annual General Meeting on 12 December 2026.",
          relationship: "NEUTRAL",
          summary: "Final approval is pending, which tempers certainty.",
          confidence: 70,
        },
      ],
      classification: "FALSE",
      confidence: 82,
      reasoning_summary:
        "Northwind has announced a 1.5% member dividend for 2026, contradicting the claim it is being cancelled. The dividend still requires AGM approval, so confidence is slightly reduced.",
      recommended_action: "Reply with the dividend announcement and AGM date.",
      requires_human_review: true,
    },
  },
  {
    bank: "northwind",
    key: "northwind-dividend-news",
    platform: "NEWS",
    author: "Regional Business Review",
    author_handle: "regional-business-review",
    content: "Northwind Cooperative Bank to pay members a 1.5% dividend for 2026, subject to AGM approval in December.",
    source_url: "https://rbr.example/northwind-dividend",
    hoursAgo: 22 * 24,
    engagement_count: 700,
    analysis: {
      institution: "Northwind Cooperative Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Northwind will pay a 1.5% member dividend for 2026, subject to AGM approval in December.",
      secondary_claims: [],
      entities: ["Northwind Cooperative Bank", "Regional Business Review"],
      financial_impact: noImpact,
      customer_impact: { level: "LOW", description: "Positive and accurate." },
      claim_severity: { level: "LOW", rationale: "Accurate reporting." },
      urgency: { level: "LOW", rationale: "None." },
      emotional_language: [],
      misinformation_indicators: [],
      observed_facts: ["The announcement states a 1.5% dividend subject to approval at the AGM on 12 December 2026."],
      ai_inferences: [],
      evidence: [
        {
          source: "northwind-dividend",
          relevant_statement: "will pay a member dividend of 1.5% on qualifying savings balances",
          relationship: "SUPPORTS",
          summary: "Confirms the dividend.",
          confidence: 96,
        },
        {
          source: "northwind-dividend",
          relevant_statement: "subject to approval at the Annual General Meeting on 12 December 2026",
          relationship: "SUPPORTS",
          summary: "Confirms the AGM condition.",
          confidence: 96,
        },
      ],
      classification: "TRUE",
      confidence: 96,
      reasoning_summary:
        "The article accurately reflects the official dividend announcement, including the AGM condition.",
      recommended_action: "No action required.",
      requires_human_review: false,
    },
  },
  {
    bank: "northwind",
    key: "northwind-ceo",
    platform: "BLOG",
    author: "The Contrarian Ledger",
    author_handle: "contrarianledger.blog",
    content:
      "Northwind's CEO is set to resign amid boardroom turmoil, according to people familiar with the matter. An announcement could come before the AGM.",
    source_url: "https://contrarianledger.example/northwind-ceo",
    hoursAgo: 11 * 24,
    engagement_count: 2_400,
    analysis: {
      institution: "Northwind Cooperative Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Northwind's CEO is about to resign because of boardroom turmoil.",
      secondary_claims: ["An announcement may come before the AGM."],
      entities: ["Northwind Cooperative Bank", "Northwind CEO"],
      financial_impact: { level: "LOW", description: "Leadership uncertainty." },
      customer_impact: { level: "LOW", description: "Little direct impact on members." },
      claim_severity: { level: "MODERATE", rationale: "Governance speculation." },
      urgency: { level: "MEDIUM", rationale: "May be picked up by mainstream press." },
      emotional_language: ["turmoil"],
      misinformation_indicators: ["Anonymous sources"],
      observed_facts: [],
      ai_inferences: ["None of the trusted sources discuss leadership changes."],
      evidence: [],
      classification: "UNVERIFIED",
      confidence: 35,
      reasoning_summary:
        "None of Northwind's trusted sources address leadership or board matters, so the claim can be neither confirmed nor refuted from the available evidence.",
      recommended_action: "Escalate to the company secretary to confirm the position before any comment.",
      requires_human_review: true,
    },
  },
  {
    bank: "northwind",
    key: "northwind-charity",
    platform: "INSTAGRAM",
    author: "Local Good News",
    author_handle: "@localgoodnews",
    content:
      "Shout out to Northwind who gave 20 million to local charities last year! That's what a community bank looks like ❤️",
    source_url: "https://instagram.example/p/11",
    hoursAgo: 17 * 24,
    engagement_count: 1_100,
    analysis: {
      institution: "Northwind Cooperative Bank",
      institution_matches_monitored_bank: true,
      primary_claim: "Northwind gave 20 million to local charities last year.",
      secondary_claims: [],
      entities: ["Northwind Cooperative Bank", "Northwind Community Fund"],
      financial_impact: noImpact,
      customer_impact: { level: "LOW", description: "Positive sentiment, inflated figure." },
      claim_severity: { level: "LOW", rationale: "Favourable but inaccurate figure." },
      urgency: { level: "LOW", rationale: "Positive post, low reach." },
      emotional_language: [],
      misinformation_indicators: ["Inflated number"],
      observed_facts: ["The Community Fund report states 2.1 million was awarded to 340 groups in 2025."],
      ai_inferences: ["The author may have misread 2.1 million as 20 million."],
      evidence: [
        {
          source: "northwind-fund",
          relevant_statement: "awarded 2.1 million in grants to 340 local charities and community groups",
          relationship: "CONTRADICTS",
          summary: "The actual figure is 2.1 million, not 20 million.",
          confidence: 88,
        },
      ],
      classification: "MISLEADING",
      confidence: 80,
      reasoning_summary:
        "Northwind did fund local charities, but the published figure is 2.1 million rather than 20 million. Although favourable, overstated figures can later be cited as evidence of inaccurate claims.",
      recommended_action: "Monitor; optionally thank the author and share the correct figure.",
      requires_human_review: true,
    },
  },
  {
    bank: "northwind",
    key: "northwind-merger-pending",
    platform: "X",
    author: "Finance Insider",
    author_handle: "@fin_insider_hq",
    content:
      "Northwind is merging with a big commercial bank next year — staff were told at a meeting today. Members will lose their vote.",
    source_url: "https://x.example/fin_insider_hq/status/12",
    hoursAgo: 5,
    engagement_count: 2_900,
  },
  {
    bank: "northwind",
    key: "northwind-outage-news-pending",
    platform: "NEWS",
    author: "Metro Evening Post",
    author_handle: "metro-evening-post",
    content:
      "Thousands of Northwind Cooperative Bank customers were left unable to pay for groceries on Tuesday evening after a card outage lasting several hours.",
    source_url: "https://metroevening.example/northwind-outage",
    hoursAgo: 40,
    engagement_count: 450,
  },
];
