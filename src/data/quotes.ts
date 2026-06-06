export const QUOTES: string[] = [
  "La discipline, c'est choisir entre ce que tu veux maintenant et ce que tu veux vraiment.",
  "De petites actions cohérentes finissent par produire des résultats extraordinaires.",
  "La douleur de la discipline pèse des grammes. La douleur du regret pèse des tonnes.",
  "Tu ne t'élèves pas au niveau de tes objectifs — tu te hisses au niveau de tes systèmes.",
  "Chaque rep que tu ne sautes pas est un vote pour la personne que tu veux devenir.",
  "La motivation te met en route. L'habitude te fait avancer.",
  "Concentre-toi sur le processus, les résultats suivront.",
  "Le meilleur moment pour agir était hier. Le deuxième meilleur moment, c'est maintenant.",
  "Décisions difficiles, vie facile. Décisions faciles, vie difficile.",
  "Le succès est la somme de petits efforts répétés jour après jour.",
  "Ne compte pas les jours. Fais que les jours comptent.",
  "La clarté précède la maîtrise. Sache exactement ce que tu vises.",
  "Une heure de travail concentré vaut mieux que huit heures d'attention dispersée.",
  "Ton futur toi t'observe à travers tes souvenirs.",
  "La constance est la marque de ceux qu'on ne peut pas battre.",
  "L'objectif n'est pas d'être parfait à la fin. C'est d'être meilleur aujourd'hui.",
  "Progresser, c'est accepter l'inconfort. Se conforter, c'est accepter la stagnation.",
  "L'énergie va là où va l'attention.",
  "Dans un an, tu regretteras de ne pas avoir commencé aujourd'hui.",
  "L'excellence n'est pas une destination — c'est un voyage qui ne s'arrête jamais.",
  "Pendant que tu hésites, d'autres avancent.",
  "Ta future version te regarde. Ne la déçois pas.",
  "Un jour ou Jour 1. C'est toi qui choisis.",
]

export function getDailyQuote(): string {
  const start = new Date(new Date().getFullYear(), 0, 1)
  const day = Math.floor((Date.now() - start.getTime()) / 86_400_000)
  return QUOTES[day % QUOTES.length]
}
