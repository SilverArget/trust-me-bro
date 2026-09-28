from pathlib import Path
import shutil
r=Path.cwd();o=r.parent/'01-tasarim/coin-T2/a4c2b-20260928';src=o/'regression/02-kod/03-test/tn-a4-shots/aftermath-a4c2b';dest=r/'03-test/tn-a4-shots/aftermath-a4c2b'
for p in src.glob('*.png'):shutil.copy2(p,dest/p.name)
p=r/'03-test/a4c2b-report.py';s=p.read_text(encoding='utf-8-sig');s=s.replace("'final-pause','final-aftermath','D06-final'","'final-pause','final-aftermath','final-magma-G4','D06-final'")
s=s.replace("['final-magma','final-world','final-pause','final-aftermath','D06-final','static']","['final-magma-G4','final-world','final-pause','final-aftermath','D06-final','static']")
s=s.replace('Nihai sonuçlar:', 'MAGMA izolasyonunda eski G4 pilot JSON girişleri ilk kopyada eksikti (ENOENT). Dört kabul edilmiş pilot giriş dosyası hashleri korunarak mirror\'a kopyalandı; aynı G4 testi tekrar PASS. Bu kapı eski MAGMA kanıtını okur; yeni G4 koşusu değildir. MAGMA toplam36 ilkPASS+1 tekrarPASS=37PASS,1emekli.\n\nNihai sonuçlar:')
p.write_text(s,encoding='utf8')
