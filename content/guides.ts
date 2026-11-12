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
    "title": "Auto Advertising vs Traditional Billboards in Bengaluru",
    "description": "Compare auto-rickshaw screen advertising with traditional fixed billboards by placement, viewing context, creative, availability and delivery evidence.",
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
    slug: "advertise-cafe-bengaluru",
    title: "How to Advertise a Café in Bengaluru",
    description: "A practical café marketing plan covering local discovery, offers, channel choice, campaign briefs and careful measurement.",
    intro: "A café campaign should fit its menu, location, opening hours and capacity. This Bengaluru guide lays out practical steps for improving local discovery and comparing paid channels—including OORO's passenger-facing auto-rickshaw screens—without assuming an ad guarantees visits or sales.",
    dateModified: "2026-11-12",
    sections: [
      { title: "Make it easy to choose your café", paragraphs: [
        "Keep your name, address, opening hours, menu, price range, accessibility details and ordering or reservation link accurate on your website and public business listings. Use current photos that help a customer understand the space and food. Make sure the phone number and map directions work on mobile.",
        "Pick one near-term objective: introduce a new café, promote a weekday menu, fill a quieter time or encourage repeat visits. Match any offer to kitchen capacity, margins and the dates it can be honored. Train staff on the terms before promoting it."
      ] },
      { title: "Write a simple campaign brief", paragraphs: [
        "Record the objective, the café's service area, campaign dates, total budget, the offer or message, and one action such as view the menu, get directions, call or reserve. Keep the message focused enough to understand at a glance.",
        "If you use a QR code or campaign URL, test it from a phone and make sure the landing page opens quickly and repeats the offer terms. A scan records an interaction; it does not represent every person who saw an ad."
      ] },
      { title: "Choose channels for the customer moment", paragraphs: [
        "Local search and accurate map listings help people who are actively looking for somewhere to eat. Social content can show a dish, atmosphere or time-limited offer. Nearby partnerships and referrals can create a direct local connection. Compare paid media by placement, price, lead time, audience context and the evidence supplied.",
        "OORO is building a network of digital screens inside autos, starting in Bengaluru. Cafés can enquire about eligible passenger-facing screen inventory. Preferred areas and campaign dates help frame planning but do not guarantee a specific vehicle, route, café visit or audience. OORO confirms inventory and terms before booking."
      ] },
      { title: "Review costs and availability before committing", paragraphs: [
        "Ask for the full cost, dates, placement, creative requirements, taxes, cancellation terms and report definitions. For OORO, creative requirements and eligible screens are confirmed for each request; a planner or enquiry is not a confirmed booking. See [how to advertise on OORO screens](/how-to-advertise-on-ooro-screens) and [campaign pricing context](/auto-advertising-cost-bengaluru)."
      ] },
      { title: "Measure the campaign with realistic signals", paragraphs: [
        "Decide what you can record before launch: reservations using a campaign code, orders, calls, directions requests or offer redemptions. Keep other promotions and operating changes on the same timeline so you can interpret the result responsibly.",
        "Compare media delivery evidence with your own business records. A device playback, QR scan, direction request and completed purchase are separate events. A rise in sales during a campaign does not by itself establish that advertising caused the increase."
      ] }
    ],
    faqs: [
      { question: "Should a new café advertise before its listing and menu are ready?", answer: "Make sure hours, location, menu and contact or ordering details are accurate first. Paid promotion is easier to evaluate when interested people can find reliable information and take the next step." },
      { question: "Can OORO guarantee café customers from an auto screen campaign?", answer: "No. OORO does not promise a specific route, viewer, café visit or sale. Eligible inventory and campaign terms are confirmed for each request." },
      { question: "What is a useful first campaign objective for a café?", answer: "Choose one concrete goal that matches current capacity, such as introducing the location or testing a specific offer during defined dates. Decide how you will record related enquiries or redemptions before launch." }
    ]
  },
  {
    slug: "digital-advertising-campaign-examples-bengaluru",
    title: "Digital Advertising Campaign Examples for Bengaluru Businesses",
    description: "Illustrative campaign planning examples for cafés, neighborhood services and retailers, with practical briefs and honest measurement limits.",
    intro: "These are illustrative planning scenarios—not OORO client campaigns, case studies, performance results or proof of available inventory. They show how a Bengaluru business might define an objective, message, channel and measurement plan before requesting a proposal.",
    dateModified: "2026-11-12",
    sections: [
      { title: "Example 1: A café introducing a weekday menu", paragraphs: [
        "Objective: let nearby customers know that a new weekday breakfast menu is available. Message: the café name, one distinctive menu detail, service days and a simple next action such as view the menu. Make sure the kitchen can handle the offer and that hours and location details are correct online.",
        "Channel plan: update the café's search and map listings, share photos on owned social channels, and compare any paid media by location context, dates, cost and eligibility. A café could enquire about OORO's passenger-facing screens, but a preferred neighborhood does not guarantee a route or visit. Track menu visits or redemptions with a dedicated link or offer code where practical."
      ] },
      { title: "Example 2: A neighborhood service opening a location", paragraphs: [
        "Objective: help people find a new clinic, salon or repair service. Message: what the business does, where it is, when it opens and how to book. Ensure the address pin, phone number and booking page are ready before promotion begins.",
        "Channel plan: use local search for people actively looking, direct customer communications with consent, and consider physical advertising if awareness beyond existing followers matters. Compare confirmed placement and dates with total cost. Record calls or bookings through a campaign-specific route if possible; do not attribute every enquiry during the period to one ad."
      ] },
      { title: "Example 3: A retailer announcing a store launch", paragraphs: [
        "Objective: announce the opening date and tell customers how to find the store. Message: brand, opening date, one reason to visit and a clear direction or landing-page action. Check that inventory, staffing and the launch offer can support the response.",
        "Channel plan: coordinate the website, maps, social announcements and any paid media so dates and offer terms match. If considering OORO screens, request available inventory and written terms; screens, dates and delivery are confirmed per campaign. Measure campaign-link visits or offer use as recorded interactions, not a full count of exposed people."
      ] },
      { title: "Turn a scenario into a real request", paragraphs: [
        "A useful brief includes one objective, business and service area, preferred dates, total budget, draft creative, desired action and contact details. Ask the provider to state what is available, what the quote includes and exactly what delivery evidence will be reported.",
        "For OORO, the format is passenger-facing digital screens inside eligible autos, starting in Bengaluru. Area preferences do not guarantee routes or audience composition. Inventory, creative approval, schedule and commercial terms must be confirmed before booking. See [how to advertise on OORO screens](/how-to-advertise-on-ooro-screens) or [submit a campaign enquiry](/advertise)."
      ] }
    ],
    faqs: [
      { question: "Are these real OORO campaigns or customer results?", answer: "No. They are illustrative planning scenarios created to show how a business could structure a brief; they do not describe OORO clients, confirmed inventory or campaign performance." },
      { question: "Do these examples guarantee neighborhood coverage?", answer: "No. Location references are hypothetical planning context. OORO confirms eligible inventory and terms for each request and does not guarantee a specific route or audience." },
      { question: "How should a business compare an advertising proposal?", answer: "Compare the same dates, placement, total cost, production and tax inclusions, cancellation terms and reporting definitions. Separate delivery records from customer outcomes." }
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
  {
    slug: "dooh-campaign-brief-bengaluru",
    title: "DOOH Campaign Brief Template for Bengaluru",
    description: "A practical DOOH campaign brief template covering objectives, audience context, locations, timing, creative, budget and reporting questions for Bengaluru advertisers.",
    intro: "A strong digital out-of-home campaign brief helps a media partner understand what the business needs, what the creative must say and how delivery should be reviewed. Use this template to prepare a focused brief for a Bengaluru campaign. It is a planning aid; it does not confirm screen availability, audience reach, pricing or bookings.",
    sections: [
      {
        title: "Write the brief around one business outcome",
        paragraphs: [
          "Start with the action or change the campaign should support: launch awareness, visits to a location, enquiries, trial of an offer or recall of a service. Pick one primary objective and name a secondary objective only if it can be measured separately.",
          "Describe the customer in useful context rather than as a guaranteed targeting segment. For example, explain whether the offer is relevant to people who live, work, study or travel near a service area. These are planning assumptions; the selected media format may not identify individual people or guarantee a route."
        ]
      },
      {
        title: "Specify place, timing and constraints",
        paragraphs: [
          "List preferred neighbourhoods, nearby landmarks or service areas, plus campaign start and end dates. Mark any required days, hours, launch dates or blackout periods. State which choices are preferences and which are essential.",
          "For mobility or outdoor media, ask the provider how area requests relate to actual inventory and movement. A requested neighbourhood does not by itself confirm a vehicle, screen, route, audience or delivery volume."
        ]
      },
      {
        title: "Give the creative team a clear message",
        paragraphs: [
          "Write one main message that can be understood quickly, then add a single call to action such as visit, scan, call or remember a short brand name. Include the exact offer, landing page, QR destination and any terms that need to appear.",
          "Describe available artwork and formats, and ask for current specifications before production. Do not assume a specific screen size, aspect ratio, duration, sound capability or QR scan distance until the media partner confirms it."
        ]
      },
      {
        title: "Agree budget, delivery and reporting questions",
        paragraphs: [
          "State the total working budget and whether it includes taxes, production or agency fees. Ask for a written proposal that separates media costs from other charges and explains what is estimated versus confirmed.",
          "Before launch, request the reporting definition: which screens and dates are included, what counts as a completed play, how outages or delayed device data are handled, and whether QR interactions are reported separately. Device Proof-of-Play can evidence reported playback; it does not prove that a person noticed the ad or that the ad caused a sale."
        ]
      },
      {
        title: "Copy-and-use campaign brief",
        paragraphs: [
          "Business and offer: [brand, product or service]. Primary objective: [one outcome]. Audience context: [who may find this useful and why]. Preferred areas: [locations and any must-have constraints]. Dates and timing: [start, end, days or hours]. Budget: [amount and inclusions]. Main message: [one sentence]. Call to action: [visit, scan, call or other action]. Creative available: [image, video, dimensions if confirmed]. Landing page or QR destination: [URL]. Success measures: [signals to review]. Reporting questions: [proof-of-play definition, screen list, exceptions and report timing]."
        ]
      }
    ],
    faqs: [
      {
        question: "Does this brief template guarantee ad availability in Bengaluru?",
        answer: "No. It organizes a request. OORO must confirm eligible screens, inventory, creative approval, dates and commercial terms before a campaign is booked."
      },
      {
        question: "Should I put estimated reach in the brief?",
        answer: "You can ask the media provider for an estimate, along with its assumptions and methodology. Treat an estimate as planning information until delivery terms are confirmed."
      },
      {
        question: "What should I send with a DOOH brief?",
        answer: "Include the objective, audience context, preferred areas, dates, budget, message, call to action, artwork status and reporting questions. Share artwork only after checking the provider's current specifications."
      }
    ],
    dateModified: "2026-11-12"
  },
  {
    "slug": "what-is-dooh-advertising-bengaluru",
    "title": "What Is DOOH Advertising? A Bengaluru Guide",
    "description": "Learn what digital out-of-home advertising means, how it differs from static outdoor media, and what to ask before planning a Bengaluru campaign.",
    "intro": "Digital out-of-home (DOOH) is advertising shown on digital screens in public or commercial environments. The phrase describes a delivery format, not one single network: screens, audience context, booking methods and measurement vary by provider. This guide explains the basics and where OORO’s passenger-facing mobility screens fit.",
    "sections": [
      {
        "title": "DOOH in plain language",
        "paragraphs": [
          "DOOH uses electronic displays to show advertising in places people visit or move through. Examples can include digital billboards, retail displays, transit environments and screens inside vehicles. A DOOH campaign may use scheduled creative rotation, but the inventory, buying workflow and reporting depend on the operator.",
          "Digital describes the screen and content workflow; it does not automatically mean online-style user targeting, a live audience count or a guaranteed number of views. Ask what the screen can actually play, how the booking works and what evidence appears in the report."
        ]
      },
      {
        "title": "How mobility screens differ from billboards",
        "paragraphs": [
          "A roadside digital billboard is fixed at a location. A passenger-facing screen in an auto or cab travels with a vehicle and creates a different viewing context. These formats should not be compared as though they offer the same placement, audience, viewing time or measurement.",
          "OORO focuses on digital screens inside eligible autos and cabs in Bengaluru. Preferred areas can inform campaign planning, but they do not guarantee a route, exact vehicle, audience profile or screen availability."
        ]
      },
      {
        "title": "Questions to ask before planning",
        "paragraphs": [
          "Confirm the screen environment, campaign dates, creative specifications, pricing inclusions, availability checks and cancellation terms. Ask whether delivery reports list screens and playback events, and how offline devices or missed plays are treated.",
          "For a practical starting point, use the [campaign brief builder](/tools/campaign-brief-builder) and review [OORO’s campaign methodology](/methodology). A planning estimate or media request is not a confirmed booking."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is every digital outdoor screen programmatic DOOH?",
        "answer": "No. A digital screen is DOOH by format. Programmatic describes a buying and delivery workflow; it is not implied by the screen itself."
      },
      {
        "question": "Does a DOOH playback report prove people saw an ad?",
        "answer": "No. Device-reported playback is evidence that a creative was reported as played. It does not establish presence, attention, recall or a purchase."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "dooh-vs-social-ads-bengaluru",
    "title": "DOOH vs Social Media Ads: How to Choose in Bengaluru",
    "description": "Compare digital out-of-home and social advertising by context, creative, measurement and campaign objective for Bengaluru businesses.",
    "intro": "DOOH and social ads can support different moments in a customer journey. One appears on physical screens in public or commercial settings; the other appears in social feeds and platforms. This comparison helps Bengaluru businesses choose a role for each channel without treating reach estimates or engagement metrics as interchangeable.",
    "sections": [
      {
        "title": "Compare the job each channel does",
        "paragraphs": [
          "Social advertising can use platform-defined audiences and online actions, subject to each platform’s controls and measurement. DOOH puts a message in a physical setting. It can support visibility or recall near relevant places, but the provider may not identify individual viewers or guarantee that a specific person sees a screen.",
          "Start with the decision you want to influence. If a customer is actively searching, search or social may help capture intent. If the goal is to make a local offer familiar in an everyday environment, an outdoor placement may be worth evaluating alongside digital channels."
        ]
      },
      {
        "title": "Use creative that fits the moment",
        "paragraphs": [
          "A social ad can carry detail, links and multiple frames. A screen creative often has a short viewing window and must make the brand, message and next action clear quickly. Ask for the actual screen dimensions, duration and playback rules before creating the asset.",
          "For OORO placements, use a concise message and a memorable action. A QR code can be tested as an interaction path, but scan likelihood depends on viewing conditions and must not be presented as guaranteed."
        ]
      },
      {
        "title": "Measure each channel on its own terms",
        "paragraphs": [
          "Social reports may include impressions, clicks or conversions defined by a platform. DOOH reporting may include scheduled delivery and device-reported plays. Those metrics describe different events and should not be added together as though they have one denominator.",
          "Set a baseline, label links consistently and use a time-bound offer or landing page when practical. Compare outcomes cautiously: a change during a campaign does not by itself prove the ad caused it. See the guide to [DOOH campaign measurement](/guides/dooh-campaign-roi-measurement)."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Should a local business choose DOOH or social ads?",
        "answer": "Choose based on the objective, customer context, available budget and reporting you need. Many businesses test a focused role for each channel rather than assuming one replaces the other."
      },
      {
        "question": "Can DOOH target the same individual users as social ads?",
        "answer": "Do not assume so. Ask the media provider what audience selection is actually available and what data it uses. OORO campaign area preferences are planning inputs, not person-level targeting."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "programmatic-dooh-explained",
    "title": "Programmatic DOOH Explained: Buying, Triggers and Limits",
    "description": "A practical explainer on programmatic digital out-of-home buying, how it differs from ordinary digital-screen advertising and what advertisers should verify.",
    "intro": "Programmatic DOOH uses software-based workflows to plan, buy or activate digital out-of-home inventory under defined rules. The term is often used loosely, so advertisers should distinguish an automated buying interface from the underlying inventory, eligibility rules and proof of delivery. This guide is educational and does not claim that OORO currently offers programmatic buying.",
    "sections": [
      {
        "title": "What programmatic DOOH usually means",
        "paragraphs": [
          "A programmatic workflow can connect inventory, campaign parameters and automated transactions through technology. Depending on the platform, buyers may select screens or packages, set budgets and schedules, and activate campaigns through a marketplace or integration.",
          "Automation does not make inventory universal or remove the need to understand who controls the screens, which placements are eligible, how creative is approved and how delivery is measured. The exact workflow varies by operator and market."
        ]
      },
      {
        "title": "Programmatic DOOH versus a digital screen campaign",
        "paragraphs": [
          "A campaign shown on a digital screen is DOOH even when it is booked by a salesperson or through a direct request. Programmatic refers to the purchasing or activation method. A digital display alone does not prove that an impression was auctioned, targeted in real time or bought through an exchange.",
          "Ask the seller to demonstrate the actual workflow: inventory discovery, deal type, activation, pacing, reporting and fees. Confirm whether stated triggers use verified data and what happens when a trigger cannot be met."
        ]
      },
      {
        "title": "What Bengaluru advertisers should verify",
        "paragraphs": [
          "Before comparing providers, request a screen list or clear description of the inventory, campaign dates, creative rules, delivery definitions, minimum spend, tax and fee treatment, and reporting sample. Ask which parts are automated and which require manual approval.",
          "OORO accepts campaign requests for eligible passenger-facing screens and confirms inventory, creative approval and terms before booking. For a request, prepare a [campaign brief](/tools/campaign-brief-builder); do not assume programmatic access or live availability."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is digital out-of-home automatically programmatic?",
        "answer": "No. DOOH identifies a digital out-of-home format. Programmatic identifies a software-based buying or activation workflow."
      },
      {
        "question": "Does programmatic mean real-time targeting of individuals?",
        "answer": "No. Do not infer person-level targeting from the term. Ask what data and selection rules are used, and whether they identify places, contexts, audiences or individuals."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "dooh-campaign-roi-measurement",
    "title": "How to Measure DOOH Campaign Performance and ROI",
    "description": "A careful framework for evaluating DOOH delivery and business outcomes, separating playback evidence, interaction signals and sales attribution.",
    "intro": "Measuring a DOOH campaign starts by separating what the screen system records from what the business hopes to change. A playback event, QR scan, store visit and sale are different signals. This Bengaluru-focused framework helps advertisers define evidence before a campaign and interpret results without overstating attribution.",
    "sections": [
      {
        "title": "Define the outcome before launch",
        "paragraphs": [
          "Choose a primary business outcome such as qualified enquiries, visits to a location, offer redemptions or awareness research. Record a baseline period and decide how long the campaign and evaluation window will run.",
          "Where possible, create a trackable destination, unique QR code, campaign-specific URL or offer code. These can connect some interactions to a campaign, but they miss people who respond later or through another path and do not capture every exposed person."
        ]
      },
      {
        "title": "Separate delivery from response",
        "paragraphs": [
          "Delivery reporting may list scheduled spots, device-reported plays, screen identifiers or playback exceptions. Ask which event qualifies as a completed play, how duplicate records are handled and how offline device data is reconciled. A booked schedule is not the same as verified playback.",
          "Response indicators can include QR scans, landing-page visits, calls or redemptions. They show recorded interactions, not every viewer or the campaign’s complete effect. Do not treat estimated audience opportunities as measured views unless a valid method supports that claim."
        ]
      },
      {
        "title": "Evaluate incrementality with care",
        "paragraphs": [
          "Compare results with an appropriate baseline or, when feasible, a comparable area or time period that did not receive the campaign. Note seasonality, promotions, price changes, weather and other marketing that could affect demand.",
          "A before-and-after increase is correlation, not proof of cause. State the method, period, sample size and limitations in the final report. OORO’s [methodology](/methodology) distinguishes device playback evidence from estimated passenger opportunities."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Can Proof-of-Play tell me the campaign’s ROI?",
        "answer": "No. Proof-of-Play can support delivery verification. ROI requires business cost and outcome data plus an attribution or evaluation method."
      },
      {
        "question": "Are QR scans a complete measure of campaign reach?",
        "answer": "No. Scans record a particular interaction. They omit people who do not scan and do not prove which other people noticed the screen."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "hyperlocal-dooh-strategy-bengaluru",
    "title": "Hyperlocal DOOH Planning in Bengaluru: A Practical Guide",
    "description": "Plan a neighbourhood-led DOOH campaign in Bengaluru with clear location preferences, timing, creative and availability checks.",
    "intro": "Hyperlocal advertising is useful when a business serves a defined area or wants to make a local offer more visible. In Bengaluru, neighbourhood names can help frame a campaign request, but they do not guarantee a route, screen or audience. This guide shows how to turn a local idea into a realistic media brief.",
    "sections": [
      {
        "title": "Choose an area based on the customer journey",
        "paragraphs": [
          "Map where customers live, work, travel or complete the next step. A café may care about nearby discovery; a service business may want to be remembered before a customer needs it. Use customer interviews, enquiry data and store locations to form a hypothesis rather than assuming a neighbourhood name proves demand.",
          "Keep the initial geography narrow enough to evaluate. Record the locations that are essential, those that are preferences and any radius or timing constraints."
        ]
      },
      {
        "title": "Treat location as a planning input",
        "paragraphs": [
          "Ask the media operator how area requests relate to available inventory and movement. For mobile screens, a vehicle’s route can change; an area preference does not establish that a particular vehicle will pass a particular point or that an individual audience will be reached.",
          "OORO’s initial operating focus is Bengaluru and its campaign requests are checked against eligible screen availability. Confirm the inventory and terms for the dates you want before committing budget."
        ]
      },
      {
        "title": "Connect the location to a measurable action",
        "paragraphs": [
          "Use a location-relevant message and a simple next action: visit a nearby outlet, explore a service area or scan a destination. Make sure the offer is valid where the campaign runs and that the destination works on a phone.",
          "Track a relevant signal such as tagged visits or redemptions, then compare it with a baseline while accounting for other promotions. Review the guide to [advertising a Bengaluru business](/guides/advertise-business-bengaluru) and the [campaign brief builder](/tools/campaign-brief-builder)."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Can I guarantee placement in a Bengaluru neighbourhood?",
        "answer": "A preference is not confirmation. Ask the operator to confirm eligible screens and any location terms in writing before booking."
      },
      {
        "question": "Does hyperlocal DOOH track a person's location?",
        "answer": "Not inherently. Ask the provider what location information is used. OORO area selections are planning preferences, not person-level tracking."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "dooh-for-startups-bengaluru",
    "title": "DOOH Advertising for Startups in Bengaluru",
    "description": "A practical checklist for startups considering digital out-of-home advertising in Bengaluru, from objectives and budget to creative tests and measurement.",
    "intro": "For an early-stage company, outdoor media can be a way to make a focused local launch more visible. It also requires disciplined budgeting: a campaign should have a clear audience context, offer and follow-up plan. This guide helps Bengaluru startups evaluate DOOH without relying on inflated reach claims or assumed results.",
    "sections": [
      {
        "title": "Use DOOH for a clear launch job",
        "paragraphs": [
          "A useful test might introduce a new location, make a product easier to remember or support a time-limited launch. Avoid trying to explain the whole product on a screen. Define one message and one next action that can be evaluated.",
          "Consider whether physical context fits the product and whether the selected environment overlaps with relevant customer routines. That is a hypothesis to test, not a guarantee of audience fit."
        ]
      },
      {
        "title": "Keep the test focused and affordable",
        "paragraphs": [
          "Set a total cap that includes media, production, taxes and any agency or service fees. Ask for written inclusions and a proposal with assumptions. Compare the proposed campaign with a smaller digital test or other channel you already use.",
          "For a first campaign, limit the number of messages, use a trackable landing page or offer where practical and agree on what reporting is available before launch. Do not spend based only on a broad estimated-reach number."
        ]
      },
      {
        "title": "Make the learning useful",
        "paragraphs": [
          "Capture a baseline, note concurrent marketing and define the evaluation window. Review device playback separately from enquiries, scans or conversions; each metric answers a different question.",
          "Document what you would change in a second flight: creative clarity, offer, dates, areas or destination. OORO confirms current eligible inventory and terms before booking; start with a [campaign brief](/tools/campaign-brief-builder) if you are preparing a request."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is DOOH suitable for a startup with a small budget?",
        "answer": "It depends on the objective, available media minimums and ability to measure a focused test. Ask for confirmed pricing and inclusions before deciding."
      },
      {
        "question": "Can startup DOOH guarantee customer acquisition?",
        "answer": "No media placement guarantees customer acquisition. A campaign can create an opportunity to communicate; outcomes depend on the offer, audience, creative, availability and other factors."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "dooh-for-real-estate-bengaluru",
    "title": "DOOH Advertising for Real Estate in Bengaluru",
    "description": "How Bengaluru real-estate marketers can assess DOOH placements, campaign timing, local context and responsible measurement.",
    "intro": "Real-estate campaigns often need to communicate a location, project stage and next step clearly. DOOH may be one part of a launch or consideration plan, but the right channel depends on the buyer journey, verified project information and available inventory. This guide offers a planning framework for Bengaluru developers and property marketers.",
    "sections": [
      {
        "title": "Match the message to the project stage",
        "paragraphs": [
          "A launch message should identify the project and location without crowding the screen. A later-stage message may point to an approved enquiry path or event. Align each claim with current, approved project information and applicable advertising requirements.",
          "Do not rely on tiny legal copy or ambiguous price claims. Ensure material conditions, availability dates and contact details are accurate and readable in the final approved creative."
        ]
      },
      {
        "title": "Plan geography without promising buyer reach",
        "paragraphs": [
          "Build a list of priority areas from documented customer research, sales enquiry origins or access routes. Treat these as preferences for media planning. A screen near an area cannot prove that a prospective buyer saw the ad or is in-market.",
          "Ask the operator what locations and dates are genuinely available, what the screen environment is and how any area constraints appear in the written proposal."
        ]
      },
      {
        "title": "Measure qualified interest carefully",
        "paragraphs": [
          "Use a dedicated landing page, event registration or enquiry code to record responses. Track qualified enquiries separately from general traffic and compare with an agreed baseline. A rise in enquiries during a launch can also reflect sales activity, search ads, broker outreach or market changes.",
          "Request delivery reporting and response metrics separately. A playback record is not evidence of a property visit, buyer intent or a sale."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Can DOOH show homes for sale near a selected project?",
        "answer": "That depends on actual available screens and campaign terms. A requested area or route is not a confirmed placement; get written confirmation from the provider."
      },
      {
        "question": "Does a campaign prove that DOOH caused a property sale?",
        "answer": "No. Sales attribution needs a defined methodology and supporting data. Playback reporting alone cannot establish causation."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "dooh-for-retail-and-fmcg-bengaluru",
    "title": "DOOH for Retail and FMCG Brands in Bengaluru",
    "description": "Plan retail and FMCG DOOH creative around product availability, local context, timing and measurable store actions in Bengaluru.",
    "intro": "Retail and FMCG advertisers can use DOOH to make a product, promotion or store visit easier to remember. The campaign still depends on the product being available where the message appears and on a clear, compliant offer. This guide helps teams plan local campaigns without assuming that screen proximity equals purchase intent.",
    "sections": [
      {
        "title": "Coordinate media with product availability",
        "paragraphs": [
          "Before launch, confirm that featured products and offers are available in the stores or service areas named in the creative. Align campaign dates with stock, opening hours, promotion terms and any retailer approval process.",
          "If availability varies across Bengaluru, make the destination or offer instructions specific enough to prevent confusion. Do not imply coverage or discount terms beyond what the business can honour."
        ]
      },
      {
        "title": "Design for quick recognition",
        "paragraphs": [
          "Use one product image or visual cue, a short brand message and one action. If a price or offer appears, include any necessary conditions in legible copy and verify it immediately before launch.",
          "Ask for the real screen specifications before exporting creative. A digital screen format does not guarantee sound, a particular playback duration or a specific viewing distance."
        ]
      },
      {
        "title": "Measure more than impressions",
        "paragraphs": [
          "Possible response signals include redemption codes, tagged visits, retailer feedback or landing-page activity. Select the signal before launch and establish a comparison period when possible.",
          "Report operational delivery separately from sales data. A QR scan is an interaction; a recorded store sale is an outcome; linking the two requires a stated attribution method."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Should a retail DOOH campaign use a QR code?",
        "answer": "Use one if a person can reasonably scan it in the placement context and the destination is useful on mobile. Test the code and provide a short URL or clear alternative where practical."
      },
      {
        "question": "Does DOOH guarantee product sales near a store?",
        "answer": "No. Media exposure does not guarantee attention, availability or purchase. Measure outcomes with separate business data."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "dooh-ad-creative-best-practices",
    "title": "DOOH Ad Creative Best Practices: A Practical Checklist",
    "description": "A practical checklist for clear digital out-of-home creative, including message hierarchy, calls to action, QR codes and technical approvals.",
    "intro": "A strong DOOH creative communicates one idea in the time available and fits the actual screen environment. The exact dimensions, duration and file requirements vary by operator, so confirm technical specifications before production. Use this checklist to make review and iteration easier.",
    "sections": [
      {
        "title": "Make the message understandable at a glance",
        "paragraphs": [
          "Lead with a recognisable brand or product, one benefit and one call to action. Remove copy that does not help the viewer understand what is being offered or what to do next. Avoid several competing messages on a single frame.",
          "Use strong contrast, readable type and a simple visual hierarchy. Preview the final artwork at realistic size and from a distance; a desktop preview can hide legibility issues."
        ]
      },
      {
        "title": "Match creative to the screen and context",
        "paragraphs": [
          "Request the current pixel dimensions, aspect ratio, supported file types, maximum file size, video duration and sound rules from the operator. Do not assume that specifications for another network apply.",
          "Use high-resolution assets and keep essential text away from edges where cropping or safe areas may matter. Test any QR code on a phone under realistic viewing conditions and verify that its destination loads quickly."
        ]
      },
      {
        "title": "Approve content and check the live destination",
        "paragraphs": [
          "Confirm pricing, offer dates, eligibility terms, contact details and destination URLs before submission. Have the brand owner review the final file and preserve the approved version for campaign records.",
          "Ask how revisions affect the schedule and who provides final approval. OORO reviews submitted creative and confirms eligibility before booking; see the existing [DOOH creative specifications guide](/guides/dooh-creative-specifications)."
        ]
      }
    ],
    "faqs": [
      {
        "question": "How many words should a DOOH ad contain?",
        "answer": "There is no universal word count. Use only the words needed to identify the brand, communicate one message and offer a clear next step; check readability in the actual screen context."
      },
      {
        "question": "What file format should I send?",
        "answer": "Ask the media operator for current specifications. Requirements vary by screen and system, so do not produce final exports based on a generic online recommendation."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "how-outdoor-advertising-works-bengaluru",
    "title": "How Outdoor Advertising Works in Bengaluru",
    "description": "Understand the steps in an outdoor advertising campaign in Bengaluru, from objective and placement request to creative approval and delivery review.",
    "intro": "Outdoor advertising places a brand message in a physical environment. Campaigns can use static billboards, digital displays, transit media or mobile screens, each with different booking, production and reporting requirements. This guide explains a practical planning sequence for Bengaluru businesses and clarifies what to verify at every step.",
    "sections": [
      {
        "title": "Select the format before comparing proposals",
        "paragraphs": [
          "Define the objective, customer context, dates and geography. Then compare formats that plausibly support the job: a fixed structure, a digital display or a screen inside a moving vehicle are not interchangeable.",
          "For each proposal, request the media environment, available dates, creative specifications, price inclusions, taxes, cancellation rules and any location guarantees in writing."
        ]
      },
      {
        "title": "Submit creative and confirm the booking",
        "paragraphs": [
          "Prepare a concise brief and ask for current artwork requirements. Submit the final file for content review and confirm the campaign schedule, screen inventory and commercial terms before assuming a booking is active.",
          "A proposed route, indicative estimate or campaign request does not equal confirmed delivery. Keep the approved creative, agreed schedule and provider confirmation together."
        ]
      },
      {
        "title": "Review evidence after the campaign",
        "paragraphs": [
          "Ask what report will be provided, when it arrives and which delivery events it includes. Separate scheduled media, device-reported playback, QR interactions and business outcomes.",
          "OORO focuses on eligible passenger-facing digital screens in Bengaluru and confirms availability before booking. For a format comparison, read [OOH vs DOOH](/guides/digital-vs-outdoor-advertising) and [mobile DOOH vs digital billboards](/guides/mobile-dooh-vs-digital-billboards)."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Does every outdoor ad need a permit?",
        "answer": "Requirements depend on the format, location, property and responsible parties. Confirm current rules and permissions with the site owner and relevant authorities before installation or display."
      },
      {
        "question": "Does OORO sell roadside billboards?",
        "answer": "OORO's current public offering focuses on passenger-facing digital screens inside eligible autos and cabs, subject to availability confirmation."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "mobile-dooh-vs-digital-billboards",
    "title": "Mobile DOOH vs Digital Billboards: What Advertisers Should Compare",
    "description": "Compare fixed digital billboards with mobile passenger-facing screens by placement, movement, creative context and delivery evidence.",
    "intro": "A digital billboard and a screen inside a moving vehicle are both digital out-of-home formats, but they differ in placement and operating context. This comparison helps Bengaluru advertisers ask better questions before evaluating a media proposal.",
    "sections": [
      {
        "title": "Fixed placement and mobile context",
        "paragraphs": [
          "A digital billboard remains at a site; its location, viewing angle and operating permissions are central to the proposal. A mobile screen moves with its vehicle, so a preferred area or route must be understood as an inventory and movement constraint rather than a fixed address.",
          "Neither format inherently guarantees who saw an ad, how long someone looked or what action they took. Ask for the evidence and assumptions behind any audience or delivery estimate."
        ]
      },
      {
        "title": "Compare operational details",
        "paragraphs": [
          "For a billboard, ask about site location, operating hours, share of voice, loop duration, display quality, maintenance and proof of play. For mobile screens, ask about eligible vehicles, dates, screen health, movement assumptions, creative review and offline reporting.",
          "Compare total cost and written inclusions rather than headline rates. Include production, taxes, agency charges and any special location or reporting fees."
        ]
      },
      {
        "title": "Choose by business objective",
        "paragraphs": [
          "A fixed site may suit a brand that prioritises a known landmark or corridor, if the placement and terms are confirmed. Mobile screens may suit a brand interested in a passenger-facing environment, subject to real inventory and actual operating routes.",
          "OORO focuses on passenger-facing screens in eligible autos and cabs, not roadside billboard inventory. For a Bengaluru request, start with [DOOH advertising in Bengaluru](/digital-advertising-bengaluru) and confirm current availability."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is a mobile screen guaranteed to pass a particular landmark?",
        "answer": "Not unless the provider explicitly confirms that in the campaign terms. A planning preference alone does not guarantee a route or pass-by."
      },
      {
        "question": "Which format has better reach?",
        "answer": "There is no universal answer. Compare the specific site or screen list, time period, methodology and audience assumptions for each proposal."
      }
    ],
    "dateModified": "2026-11-12"
  },
  {
    "slug": "dooh-audience-targeting-and-privacy",
    "title": "DOOH Audience Targeting and Privacy: What to Ask",
    "description": "Understand what audience and location targeting can mean in DOOH, what data to verify and how to avoid unsupported person-level targeting claims.",
    "intro": "The words ‘audience targeting’ can refer to many different things in out-of-home media: selecting a site, choosing a time window, using aggregate movement data or attempting to identify individuals. Advertisers should ask exactly what is happening and what evidence supports the claim. This guide focuses on responsible questions for Bengaluru campaigns.",
    "sections": [
      {
        "title": "Separate place-based planning from person-level targeting",
        "paragraphs": [
          "A campaign request naming neighbourhoods, venues or time windows is place-based planning. It does not prove that an operator can identify the people present, determine their interests or deliver an ad to a specific person.",
          "Ask whether any audience description is a planning hypothesis, an aggregate estimate, a panel measurement or a verified count. Request the time period, data source, method and margin or limitations."
        ]
      },
      {
        "title": "Ask about data and safeguards",
        "paragraphs": [
          "Ask what data is collected, whether it is aggregated or personal, how it is sourced, what retention applies and whether consent or other legal basis is required. Get answers in writing from the provider responsible for the data and the campaign.",
          "Avoid passing personal or sensitive information into a brief unless it is necessary and the provider has explained secure handling. Do not upload customer lists or device identifiers unless the workflow and lawful basis have been reviewed."
        ]
      },
      {
        "title": "Use transparent claims in campaign reporting",
        "paragraphs": [
          "Describe a location selection as a requested area, not a guaranteed audience. Distinguish estimate, scheduled delivery, device playback and response metrics in client presentations.",
          "OORO uses area preferences to support planning and confirms eligible screen availability before booking; those preferences do not constitute person-level tracking or a promise of audience composition."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Does DOOH know who looked at a screen?",
        "answer": "A screen placement alone does not identify viewers or prove attention. Ask what measurement technology is used and what its limits are."
      },
      {
        "question": "Are Bengaluru area preferences the same as geofenced targeting?",
        "answer": "No. A preferred area can guide a request, but it does not establish a geofence, a guaranteed vehicle route or an individual audience."
      }
    ],
    "dateModified": "2026-11-12"
  },
];
