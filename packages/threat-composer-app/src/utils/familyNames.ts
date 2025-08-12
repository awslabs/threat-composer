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

export const FAMILY_NAMES = [
  // English/American surnames (50)
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',

  // German surnames (50)
  'Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Schaefer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schroeder', 'Neumann', 'Schwarz', 'Zimmermann',
  'Braun', 'Krueger', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier', 'Lehmann',
  'Fuchs', 'Kaiser', 'Huber', 'Mayer', 'Herrmann', 'Koehler', 'Walter', 'Koenig', 'Schulze', 'Maier',
  'Weiss', 'Jung', 'Stark', 'Hahn', 'Schubert', 'Vogel', 'Friedrich', 'Keller', 'Guenther', 'Frank',

  // Italian surnames (50)
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
  'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
  'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone',
  'Longo', 'Gentile', 'Martinelli', 'Vitale', 'Lombardo', 'Serra', 'Coppola', 'De Santis', 'D\'Angelo', 'Marchetti',
  'Parisi', 'Villa', 'Conte', 'Ferretti', 'Sala', 'De Angelis', 'Cattaneo', 'Rossini', 'Bianco', 'Giuliani',

  // French surnames (50)
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Morel', 'Girard', 'Andre', 'Lefevre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'Francois', 'Martinez',
  'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
  'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin',

  // Spanish surnames (50)
  'Fernandez', 'Ruiz', 'Diaz', 'Moreno', 'Munoz', 'Alvarez', 'Romero', 'Alonso', 'Gutierrez', 'Navarro',
  'Torres', 'Dominguez', 'Vazquez', 'Ramos', 'Gil', 'Ramirez', 'Serrano', 'Blanco', 'Suarez', 'Molina',
  'Morales', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marin', 'Sanz', 'Iglesias', 'Medina',
  'Garrido', 'Cortes', 'Castillo', 'Santos', 'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Mendez', 'Cruz',
  'Flores', 'Herrera', 'Peña', 'Leon', 'Marquez', 'Cabrera', 'Gallego', 'Calvo', 'Vidal', 'Campos',

  // Portuguese surnames (50)
  'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Sousa', 'Rodrigues', 'Martins', 'Costa', 'Gomes',
  'Alves', 'Ribeiro', 'Carvalho', 'Teixeira', 'Moreira', 'Correia', 'Mendes', 'Nunes', 'Soares', 'Vieira',
  'Monteiro', 'Cardoso', 'Rocha', 'Neves', 'Coelho', 'Cruz', 'Cunha', 'Pinto', 'Reis', 'Fonseca',
  'Marques', 'Fernandes', 'Gonçalves', 'Barbosa', 'Melo', 'Freitas', 'Machado', 'Araújo', 'Lopes', 'Azevedo',
  'Antunes', 'Henriques', 'Simões', 'Ramos', 'Baptista', 'Esteves', 'Duarte', 'Marinho', 'Guerreiro', 'Brito',

  // Scandinavian surnames (50)
  'Andersen', 'Nielsen', 'Hansen', 'Pedersen', 'Kristensen', 'Larsen', 'Christensen', 'Paulsen', 'Johnsen', 'Sørensen',
  'Rasmussen', 'Jørgensen', 'Petersen', 'Madsen', 'Kristiansen', 'Olsen', 'Thomsen', 'Christiansen', 'Poulsen', 'Johansen',
  'Møller', 'Mortensen', 'Jensen', 'Simonsen', 'Laursen', 'Eriksen', 'Frandsen', 'Frederiksen', 'Svendsen', 'Knudsen',
  'Lindberg', 'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson',
  'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Jönsson', 'Lindqvist', 'Jakobsson', 'Magnusson',

  // Dutch surnames (50)
  'De Jong', 'Jansen', 'De Vries', 'Van Den Berg', 'Van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer',
  'De Boer', 'Mulder', 'De Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Van Leeuwen', 'Dekker', 'Brouwer',
  'De Wit', 'Dijkstra', 'Smits', 'De Graaf', 'Van Der Meer', 'Van Der Laan', 'Kok', 'Jacobs', 'De Haan', 'Vermeulen',
  'Van Den Heuvel', 'Van Der Heijden', 'Schouten', 'Van Der Veen', 'Van Den Broek', 'De Bruijn', 'De Bruin', 'Van Der Wal', 'Hoekstra', 'Van Vliet',
  'Prins', 'Blom', 'Huisman', 'Van Rijn', 'Van Den Brink', 'Koster', 'Van Der Linden', 'Van Der Pol', 'De Lange', 'Van Der Berg',

  // Polish surnames (50)
  'Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak',
  'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Kaczmarek', 'Piotrowski', 'Grabowski', 'Nowakowski',
  'Pawłowski', 'Michalski', 'Nowicki', 'Adamczyk', 'Dudek', 'Zając', 'Wieczorek', 'Jabłoński', 'Król', 'Majewski',
  'Olszewski', 'Jaworski', 'Wróbel', 'Malinowski', 'Pawlak', 'Witkowski', 'Walczak', 'Stępień', 'Górski', 'Rutkowski',
  'Michalak', 'Sikora', 'Ostrowski', 'Baran', 'Duda', 'Szewczyk', 'Tomaszewski', 'Pietrzak', 'Marciniak', 'Wróblewski',

  // Russian surnames (50)
  'Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Vasiliev', 'Petrov', 'Sokolov', 'Mikhailov', 'Novikov', 'Fedorov',
  'Morozov', 'Volkov', 'Alekseev', 'Lebedev', 'Semenov', 'Egorov', 'Pavlov', 'Kozlov', 'Stepanov', 'Nikolaev',
  'Orlov', 'Andreev', 'Makarov', 'Nikitin', 'Antonov', 'Tarasov', 'Belov', 'Komarov', 'Dmitriev', 'Petrov',
  'Titov', 'Markov', 'Frolov', 'Sergeev', 'Krylov', 'Maksimov', 'Sidorov', 'Matveev', 'Vinogradov', 'Kotov',
  'Bogdanov', 'Voronov', 'Filippov', 'Volkov', 'Zakharov', 'Zaytsev', 'Solovyov', 'Borisov', 'Kovalev', 'Ilyin',

  // Chinese surnames (50)
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
  'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo',
  'Zheng', 'Liang', 'Xie', 'Song', 'Tang', 'Xu', 'Deng', 'Han', 'Feng', 'Cao',
  'Peng', 'Zeng', 'Xiao', 'Tian', 'Dong', 'Pan', 'Yuan', 'Cai', 'Jiang', 'Yu',
  'Du', 'Ye', 'Cheng', 'Wei', 'Ren', 'Lu', 'Jin', 'Cui', 'Qin', 'Shi',

  // Japanese surnames (50)
  'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
  'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu',
  'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamashita', 'Ishikawa', 'Nakajima', 'Maeda', 'Fujita',
  'Ogawa', 'Goto', 'Okada', 'Hasegawa', 'Murakami', 'Kondo', 'Ishii', 'Saito', 'Sakamoto', 'Endo',
  'Aoki', 'Fujii', 'Nishimura', 'Fukuda', 'Ota', 'Miura', 'Takeuchi', 'Nakagawa', 'Okamoto', 'Matsuda',

  // Korean surnames (50)
  'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
  'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong',
  'Jeon', 'Go', 'Moon', 'Yang', 'Son', 'Baek', 'Heo', 'Koo', 'Nam', 'Min',
  'Ryu', 'Woo', 'Jin', 'Cha', 'Yeo', 'Noh', 'Joo', 'Shim', 'Ma', 'Won',
  'Bae', 'Suh', 'Huh', 'Myung', 'Tak', 'Pyo', 'Dok', 'Geum', 'Seok', 'Pae',

  // Indian surnames (50)
  'Sharma', 'Verma', 'Singh', 'Kumar', 'Gupta', 'Agarwal', 'Mishra', 'Jain', 'Patel', 'Shah',
  'Yadav', 'Tiwari', 'Pandey', 'Srivastava', 'Shukla', 'Dubey', 'Tripathi', 'Chandra', 'Joshi', 'Saxena',
  'Bansal', 'Mittal', 'Goel', 'Arora', 'Malhotra', 'Kapoor', 'Chopra', 'Bhatia', 'Sethi', 'Khanna',
  'Aggarwal', 'Singhal', 'Goyal', 'Jindal', 'Mahajan', 'Tandon', 'Sood', 'Bhardwaj', 'Sachdeva', 'Kohli',
  'Mehta', 'Thakur', 'Chauhan', 'Rajput', 'Nair', 'Menon', 'Pillai', 'Reddy', 'Rao', 'Krishna',

  // Arabic surnames (50)
  'Ahmed', 'Mohamed', 'Hassan', 'Ali', 'Ibrahim', 'Mahmoud', 'Omar', 'Youssef', 'Abdel', 'Khalil',
  'Farouk', 'Nasser', 'Salim', 'Rashid', 'Karim', 'Mansour', 'Saeed', 'Hamid', 'Zayed', 'Qasim',
  'Tariq', 'Faisal', 'Jamal', 'Adnan', 'Waleed', 'Amjad', 'Bilal', 'Imran', 'Usman', 'Fahad',
  'Majid', 'Samir', 'Nabil', 'Rami', 'Sami', 'Tamer', 'Wael', 'Yasser', 'Ziad', 'Amir',
  'Basim', 'Dani', 'Emad', 'Ghassan', 'Hani', 'Issa', 'Jihad', 'Karam', 'Laith', 'Mazen',

  // African surnames (50)
  'Okafor', 'Okoro', 'Eze', 'Nwankwo', 'Okonkwo', 'Chukwu', 'Okeke', 'Nwosu', 'Onyeka', 'Emeka',
  'Chioma', 'Kemi', 'Adebayo', 'Oluwaseun', 'Babatunde', 'Olumide', 'Kehinde', 'Taiwo', 'Folake', 'Bukola',
  'Temitope', 'Olabisi', 'Adunni', 'Bolanle', 'Funmilayo', 'Gbemisola', 'Iyabo', 'Jumoke', 'Khadijah', 'Latifah',
  'Maryam', 'Nafisah', 'Omolara', 'Peju', 'Ronke', 'Sade', 'Titilayo', 'Uzoma', 'Wunmi', 'Yetunde',
  'Zainab', 'Abimbola', 'Biodun', 'Chinedu', 'Damilola', 'Ebenezer', 'Folarin', 'Gbenga', 'Hakeem', 'Idris',

  // Celtic surnames (50)
  'O\'Brien', 'O\'Sullivan', 'O\'Connor', 'O\'Neill', 'Murphy', 'Kelly', 'Ryan', 'Byrne', 'Walsh', 'McCarthy',
  'Doyle', 'Gallagher', 'O\'Reilly', 'McDonnell', 'Clarke', 'Fitzgerald', 'Leary', 'Murray', 'Quinn', 'Moore',
  'McLaughlin', 'O\'Carroll', 'Connolly', 'Daly', 'O\'Connell', 'Wilson', 'Dunne', 'Brennan', 'Burke', 'Collins',
  'Campbell', 'Stewart', 'Thomson', 'Robertson', 'Anderson', 'MacDonald', 'Scott', 'Reid', 'Murray', 'Taylor',
  'Clark', 'Ross', 'Watson', 'Morrison', 'Miller', 'Fraser', 'McKenzie', 'Young', 'Walker', 'Paterson',

  // Jewish surnames (50)
  'Goldstein', 'Silverstein', 'Rosenberg', 'Weinstein', 'Friedman', 'Goldman', 'Hoffman', 'Kaufman', 'Zimmerman', 'Newman',
  'Goodman', 'Feldman', 'Rosen', 'Cohen', 'Katz', 'Levy', 'Stern', 'Klein', 'Gross', 'Stone',
  'Fox', 'Wolf', 'Diamond', 'Pearl', 'Ruby', 'Jade', 'Crystal', 'Sterling', 'Noble', 'Royal',
  'Goldberg', 'Silverberg', 'Rosenstein', 'Weinberg', 'Friedberg', 'Goldmann', 'Hoffmann', 'Kaufmann', 'Zimmermann', 'Neumann',
  'Goodmann', 'Feldmann', 'Rosenstein', 'Cohenstein', 'Katzenstein', 'Levenstein', 'Sternberg', 'Kleinberg', 'Grossberg', 'Steinberg',

  // Nature-inspired surnames (50)
  'Blackwood', 'Whitmore', 'Greenwood', 'Redwood', 'Bluestone', 'Greystone', 'Brownstone', 'Blackwell', 'Whitfield', 'Greenfield',
  'Redfield', 'Bluefield', 'Greyfield', 'Brownfield', 'Blackburn', 'Whiteburn', 'Greenburn', 'Redburn', 'Blueburn', 'Greyburn',
  'Brownburn', 'Blackwater', 'Whitewater', 'Greenwater', 'Redwater', 'Bluewater', 'Greywater', 'Brownwater', 'Nightingale', 'Morningstar',
  'Eveningstar', 'Daybreak', 'Nightfall', 'Sunrise', 'Sunset', 'Moonrise', 'Moonset', 'Starlight', 'Stormwind', 'Rainwater',
  'Snowfall', 'Frostbite', 'Winterbourne', 'Summerfield', 'Springwater', 'Fallbrook', 'Dawnbreaker', 'Duskfall', 'Lightbringer', 'Shadowhunter',
] as const;

// Note: This array contains ${FAMILY_NAMES.length} unique family names
// The random selection will work with any number of names
