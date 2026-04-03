@null: ~
@sep: |
@item: -
@hint: #
@ex_nested: u[2]{val|obj{a|b}|arr[]}: - v|{x|y}|[a|b]
@ex_grid: m[2][3]: - 1|2|3
@ex_inline: a[2]:x|y o:a=b|c=d

company:
 name=Acme Corp
 departments[3]:
 - name=Engineering
  budget: amount=500000|currency=USD
  tags[3]: core|revenue|critical
  teams[2]{name|members[]|coordinates[2]|tags[2]|scores[]|mixed[4]}:
  - Backend|[Alice|Bob|Carol]|[10|20]|[core|api]|[95|87|92|88|91]|[42|true|active|~]  # name|members[]|coordinates[2]|tags[2]|scores[]|mixed[4]
  - Frontend|[Dave|Eve]|[30|40]|[ui|react]|[85|90|88]|[100|false|pending|3.14]
  projects[3]{id|title|lead{id|name}|points[3]|milestones[4]|tags[2]}:
  - P1|API Gateway|{1|Alice}|[10|20|30]|[Q1|Q2|Q3|Q4]|[auth|security]  # id|title|lead{id|name}|points[3]|milestones[4]|tags[2]
  - P2|Auth Service|{2|Bob}|[15|25|35]|[Q1|Q2|Q3|~]|[oauth|jwt]
  - P3|UI Redesign|{3|Carol}|[5|10|15]|[Q2|Q3|~|~]|[frontend|react]
  priorities[4]: auth|scaling|security|monitoring
  messages[3]:
  - hello\|world
  - foo
  - bar
 - name=Marketing
  budget: amount=10000|currency=EUR
  tags[2]: external|brand
  teams[2]{name|members[]|campaigns[]|metrics[4]|targets[3]}:
  - Growth|[Dave|Eve|Frank]|[Social|Email|SEO]|[98|95|97|96]|[100|200|150]  # name|members[]|campaigns[]|metrics[4]|targets[3]
  - Brand|[Grace|Henry]|[TV|Print|Digital|Events]|[85|88|87|90]|[50|75|60]
  campaigns[3]{id|name|budget|channels[4]|results[3]|tags[2]}:
  - C1|Social Media|5000|[twitter|linkedin|facebook|instagram]|[10000|12000|15000]|[viral|engagement]  # id|name|budget|channels[4]|results[3]|tags[2]
  - C2|Email Marketing|3000|[sendgrid|mailchimp|~|~]|[5000|5500|4800]|[newsletter|promo]
  - C3|Content Marketing|4000|[blog|youtube|podcast|~]|[8000|9500|8700]|[seo|thought-leadership]
  channels[3]: twitter|linkedin|email
  ab_test_variants[2]: control|treatment
  performance_matrix[3][4]:
  - 98.5|85.3|92.1|~
  - 87.2|~|91.4|88.9
  - 95|93.5|89.7|90.2
 - name=Stealth
  budget: amount=10000|currency=~
  tags[1]: confidential
  teams[1]{name|members[2]|clearance_levels[3]|projects[3]|readiness[4]}:
  - Skunkworks|[Frank|Grace]|[5|4|3]|[Project X|Project Y|Project Z]|[100|95|98|97]  # name|members[2]|clearance_levels[3]|projects[3]|readiness[4]
  prototypes[2]{id|name|lead{id|name}|specs{performance[3]|weight}|tags[2]|milestones[4]}:
  - X1|Project X|{6|Frank}|{[95%|98%|97%]|2.5kg}|[core|secret]|[Q1|Q2|Q3|Q4]  # id|name|lead{id|name}|specs{performance[3]|weight}|tags[2]|milestones[4]
  - X2|Project Y|{7|Grace}|{[88%|92%|90%]|1.8kg}|[stealth|advanced]|[Q2|Q3|~|~]
  secret_codes[3]: X42|Y99|Z01
  access_levels[2]: 5|~
  backup_locations[2]: bunker-alpha|bunker-beta
  sensor_grid[2][3][4]:
  - [1|2|3|4]|[5|6|7|8]|[9|10|11|12]
  - [13|14|15|16]|[17|18|19|20]|[21|22|23|24]
  quantum_states[3][2]{amplitude|phase|probability}:
  - {0.5|0.2|0.25}|{0.3|0.8|0.15}
  - {0.7|0.1|0.35}|{0.2|0.5|0.2}
  - {0.4|0.6|0.3}|{0.1|0.3|0.1}
 contact:
  email=info@mycompany.com
  phone=+1 (123) 456-7890
  location:
   address[2]: 123 Infinite loop Ave|Suite 101
   state=CA
   zip=12345
 global_tags[3]: tech|startup|innovation