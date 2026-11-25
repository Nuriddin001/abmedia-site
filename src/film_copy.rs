//! Hand-written copy for the film pages: meta descriptions, the kind of film, section headings
//! and the sentences that describe what AB Media did. Every sentence restates a fact from
//! static/i18n.js (the brief, the idea, the scope, the credits); nothing here adds new claims.

/// Meta description per film and language, 140 to 155 characters, written by hand.
pub fn description(slug: &str, lang: &str) -> Option<&'static str> {
    Some(match (slug, lang) {
        ("good-day", "en") => "Good Day Cappuccino musical ad by AB Media: bazaar traders, builders, pupils and office staff sing about a cappuccino that tastes fresh and costs less.",
        ("good-day", "es") => "Anuncio musical de Good Day Cappuccino por AB Media: en el bazar, la obra y la oficina la gente canta al capuchino que sabe a recién hecho y cuesta menos.",
        ("good-day", "ru") => "Музыкальный ролик Good Day Cappuccino от AB Media: на базаре, стройке и в офисе люди поют о капучино со вкусом свежего, который стоит дешевле.",
        ("good-day", "ar") => "إعلان غنائي لـ Good Day Cappuccino من AB Media: في السوق وموقع البناء والمكتب يغني الناس لكابتشينو بطعم الطازج وبسعر أقل، فيلم من إنتاج كامل للاستوديو.",
        ("sales-doctor", "en") => "Sales Doctor Academy brand film by AB Media: however bad things get for a business, it can be saved. Concept, script, shoot, edit and a backstage film.",
        ("sales-doctor", "es") => "Película de marca de Sales Doctor Academy por AB Media: por mal que vaya un negocio, se puede salvar. Concepto, guion, rodaje, montaje y vídeo del rodaje.",
        ("sales-doctor", "ru") => "Имиджевый фильм Sales Doctor Academy от AB Media: как бы тяжело ни было бизнесу, его можно спасти. Концепция, сценарий, съёмка, монтаж и бэкстейдж.",
        ("sales-doctor", "ar") => "فيلم Sales Doctor Academy من AB Media: مهما ساءت حال الشركة يمكن إنقاذها. الفكرة والسيناريو والتصوير والمونتاج، مع فيلم كامل من كواليس التصوير.",
        ("grand-capital", "en") => "Grand Capital explainer film: Sarvar and Komil can't find a home to their taste until a presentation of Grand Capital homes. Shoot supervised by AB Media.",
        ("grand-capital", "es") => "Vídeo explicativo de Grand Capital: Sarvar y Komil no encuentran una casa a su gusto hasta ver las viviendas de Grand Capital. Supervisión de AB Media.",
        ("grand-capital", "ru") => "Объясняющий ролик Grand Capital: Сарвар и Комил не могут найти дом по вкусу, пока не видят дома Grand Capital. Концепция, сценарий и надзор AB Media.",
        ("grand-capital", "ar") => "فيلم تعريفي لـ Grand Capital: سرور وكامل لا يجدان بيتًا يناسب ذوقهما حتى يشاهدا عرض بيوت Grand Capital. الفكرة والسيناريو والإشراف من AB Media.",
        ("yuksalish", "en") => "Yuksalish Choy launch ad by AB Media: part of the revenue from this new tea pays for students in need, so every cup sponsors a young person's education.",
        ("yuksalish", "es") => "Anuncio de lanzamiento de Yuksalish Choy por AB Media: parte de lo que se gana con este nuevo té paga los estudios de jóvenes que lo necesitan. Ver vídeo.",
        ("yuksalish", "ru") => "Ролик запуска Yuksalish Choy от AB Media: часть выручки от нового чая идёт студентам, которым нужна помощь, и каждая чашка спонсирует чью-то учёбу.",
        ("yuksalish", "ar") => "إعلان إطلاق شاي Yuksalish Choy من AB Media: جزء من عائدات هذا الشاي الجديد يذهب لطلاب محتاجين، فكل كوب يساهم في تعليم شاب. الفكرة والتصوير والمونتاج.",
        ("imzo", "en") => "IMZO door frames ad: frames came from Tashkent after days of waiting, now Imzo makes them in Samarkand and Fergana. Production supervised by AB Media.",
        ("imzo", "es") => "Anuncio de marcos de puerta IMZO: antes llegaban de Taskent tras días de espera, ahora Imzo los fabrica en Samarcanda y Fergana. Supervisión de AB Media.",
        ("imzo", "ru") => "Ролик IMZO: дверные коробки раньше везли из Ташкента и ждали днями, теперь Imzo делает их в Самарканде и Фергане. Надзор за производством от AB Media.",
        ("imzo", "ar") => "إعلان IMZO لإطارات الأبواب: كانت تُطلب من طشقند مع أيام من الانتظار، والآن تصنعها Imzo في سمرقند وفرغانة. إشراف AB Media على التصوير والمونتاج.",
        ("zor-tv", "en") => "ZO'R TV public-service film by AB Media on saving power: a schoolboy tries to light bulbs by blowing through the pipe his mother uses for the stove.",
        ("zor-tv", "es") => "Spot social de ZO'R TV por AB Media sobre ahorrar luz: un escolar intenta encender las bombillas soplando por el tubo que su madre usa en la estufa.",
        ("zor-tv", "ru") => "Социальный ролик ZO'R TV от AB Media об экономии электричества: школьник пытается зажечь лампочки, дуя в трубку, которой мама раздувает огонь в печи.",
        ("zor-tv", "ar") => "فيلم توعوي لقناة ZO'R TV من AB Media عن توفير الكهرباء: تلميذ يحاول إضاءة المصابيح بالنفخ في الأنبوب الذي تستعمله أمه لإشعال نار الموقد. شاهد الفيلم.",
        ("toxtaniyoz", "en") => "To'xtaniyoz Ota sausage ad by AB Media: a granddaughter loves her grandfather's sausages, and his son brings the family recipe to the factory floor.",
        ("toxtaniyoz", "es") => "Anuncio de salchichas To'xtaniyoz Ota por AB Media: a la nieta le encantan las salchichas del abuelo, y su hijo lleva la receta familiar a la fábrica.",
        ("toxtaniyoz", "ru") => "Ролик сосисок To'xtaniyoz Ota от AB Media: внучке нравятся сосиски дедушки, он открывает секрет вкуса, и сын готовит их по этому рецепту на фабрике.",
        ("toxtaniyoz", "ar") => "إعلان نقانق To'xtaniyoz Ota من AB Media: الحفيدة تحب نقانق جدها، فيكشف سر نكهتها، ويبدأ ابنه بصنعها في المصنع على الوصفة نفسها. شاهد الفيلم كاملًا.",
        _ => return None,
    })
}

/// What kind of film it is, for the title: `<Film> — <service type> by AB Media`.
pub fn service(slug: &str, lang: &str) -> &'static str {
    let i = match lang { "es" => 1, "ru" => 2, "ar" => 3, _ => 0 };
    let all: [&str; 4] = match slug {
        "sales-doctor" => ["brand film", "película de marca", "имиджевый фильм", "فيلم للعلامة التجارية"],
        "grand-capital" => ["explainer film", "vídeo explicativo", "объясняющий ролик", "فيلم تعريفي"],
        "yuksalish" => ["launch commercial", "anuncio de lanzamiento", "ролик для запуска бренда", "إعلان إطلاق"],
        "imzo" => ["commercial", "anuncio", "рекламный ролик", "إعلان"],
        "good-day" => ["musical commercial", "anuncio musical", "музыкальный рекламный ролик", "إعلان غنائي"],
        "zor-tv" => ["public-service film", "spot social", "социальный ролик", "فيلم توعوي"],
        "toxtaniyoz" => ["commercial", "anuncio", "рекламный ролик", "إعلان"],
        _ => ["brand film", "vídeo de marca", "рекламный ролик", "فيلم إعلاني"],
    };
    all[i]
}

pub fn by_ab(lang: &str) -> &'static str {
    match lang { "es" => "de AB Media", "ru" => "от AB Media", "ar" => "من AB Media", _ => "by AB Media" }
}
