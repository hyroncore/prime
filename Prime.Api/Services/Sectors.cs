namespace Prime.Api.Services;

/// <summary>
/// Sector taxonomy — single source of truth for
/// purchase request classification. Sector codes are fixed (01-10) and
/// never user-editable.
/// </summary>
public static class Sectors
{
    public static readonly (string Code, string NameArabic)[] All =
    [
        ("01", "الكهرباء والتحكم الآلي"),
        ("02", "الميكانيكا ونقل الحركة والهيدروليك"),
        ("03", "الحراريات والعوازل الحرارية"),
        ("04", "المسبوكات والبطانات المعدنية"),
        ("05", "المغذيات وأنظمة نقل المواد السائبة"),
        ("06", "أدوات الورش والمواد الاستهلاكية"),
        ("07", "المصفيات والأنظمة البيئية"),
        ("08", "الزيوت والكيماويات ومواد التشغيل"),
        ("09", "التهوية وأنظمة التبريد"),
        ("10", "الآليات والمعدات الثقيلة"),
    ];

    public static bool IsValid(string? code) =>
        !string.IsNullOrWhiteSpace(code) && All.Any(s => s.Code == code);

    public static string GetName(string code) =>
        All.FirstOrDefault(s => s.Code == code).NameArabic ?? code;
}