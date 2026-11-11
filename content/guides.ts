export type Guide = { slug: string; title: string; description: string; intro: string; sections: { title: string; paragraphs: string[] }[]; faqs?: { question: string; answer: string }[]; sources?: { label: string; href: string }[]; dateModified?: string; outline?: boolean };

export const guides: Guide[] = [
  { slug: "advertise-business-bengaluru", title: "How to Advertise Your Business in Bengaluru", description: "A practical way to compare local advertising channels, set a budget and plan a campaign in Bengaluru.", intro: "A useful local campaign starts with the customer and the decision you want to influence—not a channel list. Bengaluru businesses can combine neighbourhood presence, digital discovery and direct communication, but each option serves a different moment.", sections: [
    { title: "Start with one business objective", paragraphs: ["Choose a specific action: introduce a new location, explain an offer, increase visits during a quiet period or make a service easier to remember. Keep the objective narrow enough that your creative can communicate it quickly.", "Then describe who needs to notice it and where their day already takes them. This is a planning hypothesis, not a promise that a channel can precisely identify or reach an individual audience.", "A useful one-sentence brief looks like: ‘We want people who live or work near our service area to remember [one offer] and take [one action] during [dates].’ Replace the brackets with your actual offer and dates. If you cannot name the next action, clarify the goal before buying media."] },
    { title: "Compare channels by context", paragraphs: ["Search and social advertising can reach people while they browse digital services. Outdoor formats can place a message in a physical setting. OORO focuses on digital displays inside autos and cabs; it does not sell search ads, social ads or billboard inventory.", "For any channel, compare minimum spend, creative requirements, placement context, measurement method, campaign dates and cancellation terms. Ask the provider to explain assumptions and what evidence is available after delivery.", "You can compare proposals in a simple sheet with one row per provider and columns for format, dates, included production, total cost, minimum commitment, creative deadline, availability status, cancellation terms and report contents. This makes exclusions visible before two quotes are compared as though they cover the same service."] },
    { title: "Plan a workable brief", paragraphs: ["Write down the service area, dates, objective, total budget, one message and the next action. Keep room for creative review and availability confirmation before the dates you want. Decide who will approve artwork and who will respond if customers contact the business.", "With OORO, a campaign request is reviewed against eligible inventory and commercial terms. Areas selected in a planning flow are preferences, not a guarantee of coverage. A request or forecast is not a booking confirmation."] },
    { title: "Evaluate after the campaign", paragraphs: ["Agree in advance on what the provider can report. Compare the evidence with your objective and keep other changes—pricing, weather, opening hours and promotions—in view. Do not treat estimates as verified outcomes.", "Ready to explore OORO's format? See the [Bengaluru advertising overview](/bengaluru), review [how campaigns work](/how-it-works), or [plan a campaign](/advertise)."] },
  ] },
  { slug: "outdoor-advertising-bangalore", title: "Outdoor Advertising in Bangalore: A Practical Guide", description: "How to assess outdoor advertising formats, permissions, creative and measurement in Bengaluru.", intro: "Outdoor advertising puts a message into a physical environment. Formats differ in where they appear, who controls the placement, how long a message is visible and what delivery evidence is available. Treat the format and its rules as part of the plan.", sections: [
    { title: "Understand the format first", paragraphs: ["Billboards, transit placements, street furniture and screens inside vehicles are not interchangeable. Ask where the message appears, who operates the medium, what a viewer can reasonably see and which party confirms the placement.", "OORO's service is digital advertising on screens inside autos and cabs, subject to availability confirmation. This guide compares categories for education; it does not imply OORO sells billboards or exterior vehicle wraps.", "When comparing proposals, define the physical unit first: location or vehicle, viewing direction, display position, campaign dates and creative length. A phrase such as ‘outdoor advertising’ is too broad to establish what is included."] },
    { title: "Check permissions and responsibilities", paragraphs: ["Before commissioning physical advertising, ask the operator which permissions apply to the exact location, vehicle and format. Bengaluru's published municipal advertisement bye-laws include vehicle-related provisions; applicability depends on the placement and responsible authority. Review the current rules and seek qualified advice where needed.", "Do not assume an interior passenger-facing display has the same rules as exterior vehicle branding. Confirm with the relevant operator and authorities for the specific installation."] },
    { title: "Compare cost and evidence", paragraphs: ["Request a written breakdown of media cost, production, installation if relevant, taxes, dates, cancellation terms and reporting. Ask whether reports describe booked inventory, actual playback or audience estimates; those are different measures.", "Before committing, ask who is responsible for permissions, production, installation, maintenance and removal for the exact medium. Ask for a current schedule and written confirmation of the placement rather than relying on an old rate card or an availability estimate.", "Explore OORO's [campaign planning](/advertise) and [methodology](/methodology), where estimates and their assumptions are described."] },
  ], sources: [{ label: "BBMP Advertisement Bye-laws (official PDF)", href: "https://site.bbmp.gov.in/PDF/whatsnew/BBMPAdvertisementBye_laws_English.pdf" }, { label: "ASCI Code for Self-Regulation of Advertising Content in India", href: "https://www.ascionline.in/the-asci-code/" }] },
  { slug: "auto-rickshaw-advertising", title: "How Auto-Rickshaw Advertising Works", description: "A clear guide to digital advertising inside autos, campaign planning and availability checks.", intro: "Auto-rickshaw advertising can mean several different things. This guide explains OORO's format: digital creative shown on screens inside participating autos and cabs, with campaign availability confirmed before a booking.", sections: [
    { title: "Interior screens and exterior wraps are different", paragraphs: ["An interior screen is viewed by people travelling in the vehicle. An exterior wrap is a printed surface on the vehicle. The production, permissions, visibility and measurement questions are different, so ask which format a proposal covers.", "OORO offers passenger-facing digital screen placements where eligible inventory is available. OORO does not represent this as an exterior wrap service. For a physical format, confirm the exact vehicle surface and installation responsibility with its operator."] },
    { title: "From brief to confirmed campaign", paragraphs: ["A useful brief states the objective, preferred areas, dates, budget and creative idea. The operator then reviews the request, creative and available inventory before confirming commercial terms and schedule. Give enough lead time for review, and ask what approval or confirmation is still outstanding.", "A submitted request, forecast or location preference does not itself confirm a vehicle, route, audience or booking. OORO explains its planning assumptions in the [methodology](/methodology) and [campaign process](/how-it-works)."] },
    { title: "Creative and proof", paragraphs: ["Use one clear idea, readable type and a memorable next action. Confirm the destination display's aspect ratio, duration and file constraints before producing final work; requirements can vary by screen.", "Ask what evidence follows delivery. OORO's Proof-of-Play reporting concerns playback records where supported; it is not a count of unique passengers or guaranteed campaign outcomes. See our [creative guide](/guides/dooh-creative-specifications)."] },
  ] },
  { slug: "set-local-advertising-budget", title: "How to Set a Local Advertising Budget", description: "A straightforward framework for allocating a local campaign budget without assuming reach or results.", intro: "A budget is a decision about what you can spend and learn—not a reliable shortcut to a promised number of customers. Start with the amount you can afford, a time window and one objective.", sections: [
    { title: "Set a safe total", paragraphs: ["Choose a total that leaves cash available for operations. Separate media from creative production, taxes and any other costs, and ask providers to state which items their quote includes. Avoid using money reserved for payroll, rent, stock or other near-term obligations.", "Our [budget planner](/tools/ad-budget-planner) divides a user-entered amount evenly across the selected days as a simple planning exercise. It does not estimate inventory, impressions, reach, leads or return."] },
    { title: "Match spend to a test", paragraphs: ["For a first test, define what you want to learn: whether the message is understood, whether a location is operationally suitable, or whether enquiries mention the campaign. A small test is useful only when its scope and limitations are clear. Choose a duration long enough for the planned activity, then check that the business can fulfil the offer during that period.", "For OORO, the self-serve planning flow accepts budgets from ₹500. This is an input floor in that tool, not a media rate, confirmed quote or guarantee of delivery. Availability and terms are confirmed separately.", "Worked arithmetic example: allocating ₹14,000 evenly over seven days gives ₹2,000 per day. This says only how the entered total is distributed; it is not an estimate of media units, views, customer response or value."] },
    { title: "Review the evidence", paragraphs: ["Record the dates, creative, offer and other promotions running at the same time. Afterward, compare provider reports with your stated objective and keep correlation separate from proof of causation. Note questions you would change for a second test before you see the outcome, so the evaluation is not shaped only by hindsight.", "Continue to [OORO campaign planning](/advertise) or read [how the process works](/how-it-works)."] },
  ] },
  { slug: "dooh-creative-specifications", title: "Preparing Creative for a Digital Screen Campaign", description: "Practical creative preparation guidance and verified file formats for OORO digital screen campaigns.", intro: "A strong screen creative communicates one idea before the moment passes. The final technical brief depends on the destination screen, so confirm its exact dimensions and playback requirements before exporting.", sections: [
    { title: "Lead with a single message", paragraphs: ["Use a short headline, one visual focus and a clear next action. Keep the brand and offer legible at a glance, and test the design at the actual display size rather than only on a desktop preview.", "Use contrast and type sizes that remain readable from the viewing position. Avoid placing essential information at the extreme edges until safe areas are confirmed. If the message needs a paragraph of explanation, move the detail to a mobile landing page and keep the screen creative focused."] },
    { title: "Confirm the destination requirements", paragraphs: ["OORO's creative upload endpoint accepts JPEG, PNG, WebP, MP4 and WebM files. This is only the accepted file-type list; it does not define a universal aspect ratio, resolution, maximum file size or video duration.", "Ask the campaign team to confirm the destination screen's current specifications and review process before producing final artwork. The team may request adjustments for fit or legibility."] },
    { title: "Review before submission", paragraphs: ["Check spelling, offer dates, contact details, contrast, captions and any required advertiser disclosures. Ensure the landing page works on mobile and that QR codes, if used, are large enough to scan in the intended context. Preview a still frame at phone size and ask someone unfamiliar with the brief what they understood after a quick look.", "Read the [campaign process](/how-it-works) and [plan a campaign](/advertise). For advertising content, consult the [ASCI Code](https://www.ascionline.in/the-asci-code/)."] },
  ], sources: [{ label: "ASCI Code for Self-Regulation of Advertising Content in India", href: "https://www.ascionline.in/the-asci-code/" }] },
  {
    "slug": "digital-vs-outdoor-advertising",
    "title": "OOH vs DOOH Advertising in Bengaluru: How to Choose",
    "description": "Compare online advertising, fixed outdoor media and digital out-of-home advertising in Bengaluru by context, buying unit and evidence.",
    "intro": "“Digital advertising” can mean ads on websites and apps; “digital outdoor” usually means screen-based messages in physical places. This guide separates the terms and gives Bengaluru businesses a practical way to compare them.",
    "dateModified": "2026-11-12",
    "sections": [
      {
        "title": "First, separate online ads from digital out-of-home",
        "paragraphs": [
          "Search and social advertising appear on phones, computers and other connected services. Out-of-home (OOH) advertising appears in physical environments such as streets, transit locations and venues. Digital out-of-home (DOOH) uses a screen in that physical setting. A screen being digital does not make it an online ad.",
          "Digital outdoor advertising in Bangalore can refer to several placements: a fixed screen at a venue, a roadside display, or a screen inside a moving vehicle. Ask which exact placement is included. The location, viewing context, permissions, creative rules and reporting differ by format."
        ]
      },
      {
        "title": "Compare what you are actually buying",
        "paragraphs": [
          "For search, clarify the campaign objective, audience or query settings, spend, landing page and conversion tracking. For a fixed outdoor placement, confirm the site, display schedule, dates, production costs and how playback or installation will be documented. For mobile DOOH, ask which screens and dates can be confirmed, how area preferences are used, and what playback evidence is available.",
          "Do not compare an estimated audience opportunity from one proposal with a verified playback record from another. They describe different things. Ask each provider to define the unit, data source, time period and exclusions behind every number."
        ]
      },
      {
        "title": "Where OORO fits in Bengaluru",
        "paragraphs": [
          "OORO focuses on passenger-facing digital screens inside eligible autos and cabs. This is mobile DOOH: the physical placement is inside a vehicle, rather than a fixed roadside billboard or an online search or social ad. OORO reviews creative, eligible inventory and commercial terms for each request before booking.",
          "Preferred neighborhoods help describe a campaign brief; they do not guarantee a route, vehicle, audience profile or availability. See the [Bengaluru DOOH overview](/digital-advertising-bengaluru), [cab advertising page](/cab-advertising-bengaluru), and [coverage details](/coverage) for OORO’s service scope."
        ]
      },
      {
        "title": "A checklist for choosing a channel",
        "paragraphs": [
          "Write one objective and the action you want a customer to take. Then compare each proposal using the same dates, total budget, production requirements, cancellation terms and reporting definitions. Check whether the message fits the viewing moment: a detailed explanation may work on a landing page but be hard to absorb during a short trip or quick glance.",
          "Before paying, get the placement and schedule in writing. Decide what business outcome you will measure separately from media delivery, such as enquiries using a dedicated code or visits recorded in your own system. Such measures can help evaluate a test, but they do not prove that one ad caused every result."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is DOOH the same as online digital advertising?",
        "answer": "No. Online ads appear on connected services and devices. DOOH is screen-based advertising in physical environments outside the home."
      },
      {
        "question": "Does OORO sell digital billboards in Bengaluru?",
        "answer": "OORO’s listed format is a passenger-facing screen inside eligible autos and cabs. It does not sell fixed billboard inventory."
      },
      {
        "question": "What should I compare between proposals?",
        "answer": "Compare the placement, dates, total cost, production, availability, cancellation terms and reporting unit. Separate estimated audience figures from device playback evidence."
      }
    ]
  },
  {
    "slug": "small-business-marketing-ideas-bengaluru",
    "title": "Small Business Marketing Ideas in Bengaluru",
    "description": "A practical, budget-aware framework for choosing local marketing channels, writing a campaign brief and measuring what you can.",
    "intro": "Good small-business marketing begins with a real customer decision: finding your shop, understanding an offer, booking a service or returning again. Use this Bengaluru guide to choose a sensible next step without assuming every channel fits every business.",
    "dateModified": "2026-11-12",
    "sections": [
      {
        "title": "Start with the business and customer",
        "paragraphs": [
          "Write down what you sell, where customers can realistically reach you, your operating hours and the next action you want a person to take. A café promoting weekday breakfast, a salon filling appointments and a retailer announcing a new branch have different messages and time windows.",
          "Choose one objective for the first campaign. “Grow awareness” is a start; make it more useful by describing the people, area and period involved. Avoid promising a result before you know what the channel can measure."
        ]
      },
      {
        "title": "Build the low-cost foundations first",
        "paragraphs": [
          "Keep your business name, address, phone, hours and service details consistent across your website and public listings. Make the website work well on mobile, explain your offer clearly, and give people a direct way to enquire or book. Ask satisfied customers for honest reviews through the platform’s normal process; do not buy or fabricate reviews.",
          "Use owned channels you can maintain: a customer email or WhatsApp list with consent, a simple referral offer, useful social posts, or partnerships with nearby businesses. These activities are not free of effort, but they let you explain the offer directly and learn which questions customers ask."
        ]
      },
      {
        "title": "Choose paid channels by intent and context",
        "paragraphs": [
          "Local search can help when someone is actively looking for a product or service. Social advertising can introduce an offer in a feed. Outdoor media can put a message in a physical setting. DOOH uses digital screens in those settings. Each channel has different buying units and measurement limits, so ask what you receive before you compare prices.",
          "OORO offers passenger-facing screens inside eligible autos and cabs in Bengaluru. This may be a channel to evaluate when a business wants a physical brand message during everyday travel. It is not a guarantee of a particular route, passenger, store visit or sale. Learn about [OORO’s Bengaluru service](/bengaluru) and [how campaign requests are reviewed](/how-it-works)."
        ]
      },
      {
        "title": "Set a test that protects cash flow",
        "paragraphs": [
          "Choose a total spend that leaves money for payroll, stock, rent and service delivery. Separate media cost from creative production, taxes and other fees. Start with a clear test period and one message; do not spread a small budget across many channels before you can learn from any of them.",
          "Before launch, write down the measure you will check: calls, booked appointments, coupon redemptions, website enquiries or another operational signal. Record other promotions and business changes too. A rise in sales during a campaign is useful context, but by itself it does not prove the ad caused the increase."
        ]
      },
      {
        "title": "Review, keep, change or stop",
        "paragraphs": [
          "At the end of the test, compare the actual spend and provider report with your original objective. Keep estimates, clicks, playback records and customer outcomes in separate columns. Note what you would change about the message, timing or channel next time.",
          "Use the [local advertising budget planner](/tools/ad-budget-planner) for simple daily allocation; it does not estimate reach or results. For a channel comparison, read [digital vs outdoor advertising in Bengaluru](/guides/digital-vs-outdoor-advertising)."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Which marketing channel should a small business in Bengaluru start with?",
        "answer": "Start where customers already look for your service, then choose one measurable objective. Local search, referrals, social media and physical advertising serve different moments; the right mix depends on the business."
      },
      {
        "question": "Does OORO guarantee customers or sales?",
        "answer": "No. OORO provides a media format and confirms eligible inventory and terms before booking. A campaign or playback report is not a guarantee of visits, conversions or sales."
      },
      {
        "question": "How can I test a marketing idea without overspending?",
        "answer": "Set a total budget you can afford, run one clearly scoped test, track one operational outcome and record other changes that could affect the result."
      }
    ]
  },
  {
    "slug": "auto-advertising-vs-billboards",
    "title": "Auto Advertising vs Billboard Advertising: A Bengaluru Comparison",
    "description": "Compare in-vehicle screens with fixed billboards by placement, viewing context, creative, confirmation and delivery evidence.",
    "intro": "An auto screen and a billboard are different advertising products. One is a passenger-facing display inside an eligible vehicle; the other is a fixed placement. This comparison helps Bengaluru advertisers ask for the right unit before comparing cost.",
    "dateModified": "2026-11-12",
    "sections": [
      {
        "title": "The placement changes the viewing moment",
        "paragraphs": [
          "A billboard is tied to a fixed site. An in-vehicle screen is inside an auto or cab and is viewed in a passenger setting. The formats have different sightlines, dwell conditions, creative constraints and operating dependencies. A moving vehicle screen should not be described as a guaranteed route or neighborhood placement.",
          "OORO’s service is the passenger-facing in-vehicle screen format, where eligible inventory is available. OORO does not sell billboard placements or exterior auto wraps."
        ]
      },
      {
        "title": "Ask how availability is confirmed",
        "paragraphs": [
          "For a billboard, ask for the exact site, dates, display schedule, production requirements and any applicable permissions. For an in-vehicle campaign, ask which screens can be confirmed for the requested dates, how preferred areas are treated, and what happens if inventory or the schedule changes.",
          "Do not treat a planning map, forecast, old availability sheet or location preference as a booking. Get the specific placement, dates and commercial terms in writing."
        ]
      },
      {
        "title": "Compare creative and reporting separately",
        "paragraphs": [
          "A fixed billboard may allow a different viewing distance and time than a passenger-facing screen. Ask the operator for the exact creative dimensions, duration, review deadline and production responsibility before artwork is made. Requirements vary by display.",
          "Ask what evidence the final report contains. A site photograph, booked schedule, playback log and audience estimate are different records. Proof-of-Play can show device-reported playback where supported; it does not by itself measure unique people, attention or sales."
        ]
      },
      {
        "title": "Use a neutral buying checklist",
        "paragraphs": [
          "Compare total cost for the same dates and campaign length. Include production, taxes, installation, cancellation, maintenance and reporting. Confirm who handles permits or other approvals for the exact placement; rules can differ for a fixed site, vehicle exterior and interior screen. Consult current requirements with the responsible operator or authority.",
          "Read the [outdoor advertising guide](/guides/outdoor-advertising-bangalore), review [OORO’s in-vehicle screen format](/digital-advertising-bengaluru), or see the [auto advertising cost guide](/auto-advertising-cost-bengaluru) before requesting a proposal."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is auto advertising the same as a billboard on wheels?",
        "answer": "Not necessarily. OORO’s described format is an interior passenger-facing screen, not an exterior vehicle wrap or a fixed billboard mounted on a vehicle."
      },
      {
        "question": "Can I guarantee that an auto follows a certain route?",
        "answer": "No. Preferred areas may guide planning, but OORO does not promise a specific vehicle, route or audience."
      },
      {
        "question": "Can I compare billboard CPM with OORO playback records?",
        "answer": "Only after checking the definitions and sources. An estimated audience metric and a device playback record measure different things."
      }
    ],
    "sources": [
      {
        "label": "BBMP Advertisement Bye-laws (official PDF)",
        "href": "https://site.bbmp.gov.in/PDF/whatsnew/BBMPAdvertisementBye_laws_English.pdf"
      },
      {
        "label": "ASCI Code for Self-Regulation of Advertising Content in India",
        "href": "https://www.ascionline.in/the-asci-code/"
      }
    ]
  },
  {
    "slug": "restaurant-local-advertising",
    "title": "How Restaurants Can Evaluate Local Advertising in Bengaluru",
    "description": "A practical checklist for restaurant catchment, offers, channel selection, campaign spend and honest measurement.",
    "intro": "Restaurant advertising works best when the message fits the menu, hours, service area and capacity of the business. This guide helps Bengaluru restaurants compare local channels without assuming that an ad automatically becomes a reservation or walk-in.",
    "dateModified": "2026-11-12",
    "sections": [
      {
        "title": "Match the offer to operations",
        "paragraphs": [
          "Start with the restaurant’s service area, open hours, busiest and quietest periods, ordering method and the offer’s unit economics. A promotion that creates demand when the kitchen is already at capacity can frustrate customers. Make sure staff know the offer, its conditions and how long it runs.",
          "Choose one decision to influence: discover the location, view the menu, place an order, book a table or remember a seasonal offer. Use a short message and one action that works on a phone."
        ]
      },
      {
        "title": "Build discoverability before buying more reach",
        "paragraphs": [
          "Keep your menu, hours, location, booking links and phone number accurate on your website and public business listings. Add useful photos and answer common customer questions. Ask for honest reviews from real customers without offering rewards for positive sentiment or posting fabricated feedback.",
          "Use customer communications with consent, nearby partnerships, community events and social content where they fit. These channels let a restaurant test messages and offers directly, though they still require time and good service."
        ]
      },
      {
        "title": "Compare paid channels by customer moment",
        "paragraphs": [
          "Local search can help when someone is looking for a place to eat now. Social media can show a menu or offer while people browse. Outdoor media places a message in a physical context. OORO offers passenger-facing digital screens inside eligible autos and cabs in Bengaluru; it does not sell search ads, social campaigns or billboards.",
          "Consider a physical screen when a brief calls for broad local brand communication and you can make the message clear at a glance. Preferred areas are planning inputs, not a guarantee of a specific route, passenger or restaurant visit. Availability and terms are confirmed for each OORO request."
        ]
      },
      {
        "title": "Measure the test without overstating attribution",
        "paragraphs": [
          "Before launch, choose an operational measure you can record: reservations using a dedicated code, calls, online orders, menu visits or customers mentioning an offer. Keep the campaign dates and other promotions on the same timeline. Use an offer the business can fulfil and make its terms easy to understand.",
          "Afterward, compare the provider’s delivery evidence with your own customer data. Device playback, QR scans, footfall estimates and completed restaurant orders are different steps in a customer journey. A scan or order during a campaign does not prove that the screen caused it."
        ]
      },
      {
        "title": "A restaurant campaign brief",
        "paragraphs": [
          "Prepare the location, service area, campaign dates, objective, offer terms, budget, creative idea and the next action. Ask each media provider for the placement, total cost, production and tax inclusions, cancellation rules and report definitions. If you are considering OORO, see [how to plan a Bengaluru campaign](/bengaluru) and [what playback reporting can establish](/methodology)."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is in-vehicle DOOH a direct-response channel for restaurant orders?",
        "answer": "Not necessarily. A screen can carry a brand or offer message, but OORO does not guarantee a reservation, visit or sale. Track customer actions separately and treat attribution carefully."
      },
      {
        "question": "Can a Bengaluru restaurant choose a specific neighborhood?",
        "answer": "You can include preferred areas in the brief. OORO checks eligible inventory and confirms terms; it does not guarantee a route or a specific audience."
      },
      {
        "question": "What should a restaurant track during a campaign?",
        "answer": "Choose an operational measure such as calls, bookings, code redemptions or online orders, and record other promotions and capacity changes that could affect demand."
      }
    ]
  },
  {
    "slug": "proof-of-play-dooh",
    "title": "Understanding Proof-of-Play in Digital Out-of-Home Advertising",
    "description": "Learn what a DOOH playback record can show, how it differs from a booking or audience estimate, and what to ask a media provider.",
    "intro": "Proof-of-Play (PoP) is evidence that a display system recorded a creative as played. The exact fields and reliability depend on the provider’s devices and reporting. It is useful delivery evidence, but it is not automatically an audience count.",
    "dateModified": "2026-11-12",
    "sections": [
      {
        "title": "Separate booking, schedule and playback",
        "paragraphs": [
          "A booking records agreed media terms. A schedule describes what the system is meant to play. A playback event is a device-reported record that a creative ran. These stages should not be collapsed into one claim: a booking is not proof of playback, and a scheduled slot is not a verified audience.",
          "Ask the provider whether its report uses device events, operator checks, photographs or another source. The report should say what an event means and which screens and dates it covers."
        ]
      },
      {
        "title": "What a playback report may contain",
        "paragraphs": [
          "Depending on the system, a report may identify a device or screen, creative, playback time, duration and a success or failure state. Ask how timestamps are set, how duplicate events are handled, what happens when a device is offline and whether delayed records can arrive after a campaign ends.",
          "OORO’s public [measurement methodology](/methodology) describes the distinction between device playback evidence and estimated passenger opportunities. The exact fields available can depend on the campaign workflow and screen."
        ]
      },
      {
        "title": "What Proof-of-Play does not prove",
        "paragraphs": [
          "A playback record alone does not establish that a person was present, looked at the screen, noticed the message, remembered it or purchased something. It does not prove unique reach or attention unless a separate, valid measurement method supports those claims.",
          "QR scans and web visits can be useful signals of interaction, but they are not interchangeable with screen plays or sales. Interpret each metric using its own denominator and collection method."
        ]
      },
      {
        "title": "Questions to ask before buying DOOH",
        "paragraphs": [
          "Ask which event states count as a completed play, the reporting window, the screen list, campaign dates, exceptions, device-health rules and how missing data is handled. Request a sample report with sensitive details removed before launch so you understand what evidence you will receive.",
          "Agree how shortfalls, schedule changes or failed plays are handled in the commercial terms. Compare providers only when their playback definitions, time periods and inclusion rules are clear."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Does Proof-of-Play count people who saw an ad?",
        "answer": "No. A device playback record shows that the system reported the creative as played. It does not by itself count viewers or prove attention."
      },
      {
        "question": "Is a scheduled impression the same as a completed play?",
        "answer": "No. A schedule is intended delivery; a playback record is device-reported evidence after the event. Ask the provider which states and exceptions its report includes."
      },
      {
        "question": "Can Proof-of-Play show campaign sales?",
        "answer": "No. Sales require separate business or attribution data. A playback record can be compared with outcomes, but it does not establish that the ad caused them."
      }
    ]
  },
];
