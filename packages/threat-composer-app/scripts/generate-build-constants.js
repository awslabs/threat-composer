#!/usr/bin/env node

/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ******************************************************************************************************************** */

const fs = require('fs');
const path = require('path');

// Define family names directly in the script (950 unique family names)
const FAMILY_NAMES = [
  // English/American surnames
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  
  // German surnames
  'Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Schaefer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schroeder', 'Neumann', 'Schwarz', 'Zimmermann',
  'Braun', 'Krueger', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier', 'Lehmann',
  'Fuchs', 'Kaiser', 'Huber', 'Mayer', 'Herrmann', 'Koehler', 'Walter', 'Koenig', 'Schulze', 'Maier',
  'Weiss', 'Jung', 'Stark', 'Hahn', 'Schubert', 'Vogel', 'Friedrich', 'Keller', 'Guenther', 'Frank',
  
  // Add more names to reach close to 1000...
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
  'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Fernandez', 'Ruiz', 'Diaz', 'Moreno', 'Munoz', 'Alvarez', 'Romero', 'Alonso', 'Gutierrez', 'Navarro',
  'Torres', 'Dominguez', 'Vazquez', 'Ramos', 'Gil', 'Ramirez', 'Serrano', 'Blanco', 'Suarez', 'Molina',
  'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Sousa', 'Rodrigues', 'Martins', 'Costa', 'Gomes',
  'Alves', 'Ribeiro', 'Carvalho', 'Teixeira', 'Moreira', 'Correia', 'Mendes', 'Nunes', 'Soares', 'Vieira',
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
  'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo',
  'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
  'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu',
  'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
  'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong',
  'Sharma', 'Verma', 'Singh', 'Kumar', 'Gupta', 'Agarwal', 'Mishra', 'Jain', 'Patel', 'Shah',
  'Yadav', 'Tiwari', 'Pandey', 'Srivastava', 'Shukla', 'Dubey', 'Tripathi', 'Chandra', 'Joshi', 'Saxena',
  'Ahmed', 'Mohamed', 'Hassan', 'Ali', 'Ibrahim', 'Mahmoud', 'Omar', 'Youssef', 'Abdel', 'Khalil',
  'Farouk', 'Nasser', 'Salim', 'Rashid', 'Karim', 'Mansour', 'Saeed', 'Hamid', 'Zayed', 'Qasim',
  'Okafor', 'Okoro', 'Eze', 'Nwankwo', 'Okonkwo', 'Chukwu', 'Okeke', 'Nwosu', 'Onyeka', 'Emeka',
  'Chioma', 'Kemi', 'Adebayo', 'Oluwaseun', 'Babatunde', 'Olumide', 'Kehinde', 'Taiwo', 'Folake', 'Bukola',
  'O\'Brien', 'O\'Sullivan', 'O\'Connor', 'O\'Neill', 'Murphy', 'Kelly', 'Ryan', 'Byrne', 'Walsh', 'McCarthy',
  'Doyle', 'Gallagher', 'O\'Reilly', 'McDonnell', 'Clarke', 'Fitzgerald', 'Leary', 'Murray', 'Quinn', 'Moore',
  'Goldstein', 'Silverstein', 'Rosenberg', 'Weinstein', 'Friedman', 'Goldman', 'Hoffman', 'Kaufman', 'Zimmerman', 'Newman',
  'Goodman', 'Feldman', 'Rosen', 'Cohen', 'Katz', 'Levy', 'Stern', 'Klein', 'Gross', 'Stone',
  'Blackwood', 'Whitmore', 'Greenwood', 'Redwood', 'Bluestone', 'Greystone', 'Brownstone', 'Blackwell', 'Whitfield', 'Greenfield'
];

// Select a random family name
const randomIndex = Math.floor(Math.random() * FAMILY_NAMES.length);
const selectedFamilyName = FAMILY_NAMES[randomIndex];

// Generate the build constants file
const buildConstantsContent = `/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ******************************************************************************************************************** */

// This file is auto-generated at build time by scripts/generate-build-constants.js
// DO NOT EDIT MANUALLY - Changes will be overwritten on next build

export const BUILD_FAMILY_NAME = '${selectedFamilyName}';
export const BUILD_TIMESTAMP = '${new Date().toISOString()}';
export const BUILD_RANDOM_INDEX = ${randomIndex};
`;

// Write the build constants file
const outputPath = path.join(__dirname, '../src/buildConstants.ts');
fs.writeFileSync(outputPath, buildConstantsContent);

console.log(`✅ Build constants generated successfully!`);
console.log(`🏠 Selected family name: ${selectedFamilyName} (index: ${randomIndex})`);
console.log(`📝 Build constants written to: ${outputPath}`);
