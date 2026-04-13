# ==============================================================================
# --- BASE FROM SYSTEM ---
# (Do not touch these lines unless you know what you are doing)
# ==============================================================================

case $- in
    *i*) ;;
      *) return;;
esac

HISTCONTROL=ignoreboth
shopt -s histappend
HISTSIZE=1000
HISTFILESIZE=2000
shopt -s checkwinsize

[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'

if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi

if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

# ==============================================================================
# --- END FROM SYSTEM ---
# ==============================================================================

# ==============================================================================
# --- CUSTOM CONFIGURATION ---
# ==============================================================================

prompt_mem() {
    local mem_info=$(free -m | awk '/Mem:/ {
        used=$3; total=$2;
        pct=(used/total)*100;
        gb=total/1024;
        printf "%.0f%% (%.1fGB)", pct, gb
    }')
    echo -e "🧠 \033[01;36m${mem_info}\033[00m \033[38;5;244m|\033[00m "
}

prompt_disk() {
    local disk_info=$(df -h / | awk 'NR==2 {
        pct=$5; total=$2;
        if(total ~ /[Gg]$/) total=total"B";
        else if(total ~ /[Tt]$/) total=total"B";
        else if(total ~ /[Mm]$/) total=total"B";
        printf "%s (%s)", pct, total
    }')
    echo -e "💽 \033[01;35m${disk_info}\033[00m \033[38;5;244m|\033[00m "
}

prompt_temp() {
    local temp_path="/sys/class/thermal/thermal_zone0/temp"
    if [ -f "$temp_path" ]; then
        local temp_raw=$(cat "$temp_path" 2>/dev/null)
        if [ -n "$temp_raw" ]; then
            local temp_c=$((temp_raw / 1000))
            echo -e "🌡️ \033[01;33m${temp_c}ºC\033[00m \033[38;5;244m|\033[00m "
        fi
    fi
}

prompt_power_supply() {
    local bat_path="/sys/class/power_supply/BAT0/capacity"
    local ac_path="/sys/class/power_supply/AC/online"

    if [ -f "$bat_path" ]; then
        local pct=$(cat "$bat_path" 2>/dev/null)
        if [ -n "$pct" ]; then
            if [ -f "$ac_path" ]; then
                local ac=$(cat "$ac_path" 2>/dev/null)
                if [ "$ac" = "1" ]; then
                    echo -e "🔋 \033[01;32m${pct}%\033[00m 🔌 \033[38;5;244m|\033[00m "
                else
                    echo -e "⚠️  \033[01;31mBATTERY: ${pct}%\033[00m \033[38;5;244m|\033[00m "
                fi
            else
                echo -e "🔋 \033[01;32m${pct}%\033[00m \033[38;5;244m|\033[00m "
            fi
        fi
    fi
}

prompt_git() {
    local branch=$(git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/')
    if [ -n "$branch" ]; then
        echo -e "🌿 \033[01;32m${branch}\033[00m \033[38;5;244m|\033[00m "
    fi
}

prompt_host() {
    local hname=$(hostname -s)
    echo -e "🌍 \033[01;34m${hname}\033[00m"
}

GRAY="\[\033[38;5;244m\]"
GREEN="\[\033[01;32m\]"
BLUE="\[\033[01;34m\]"
WHITE="\[\033[01;37m\]"
RESET="\[\033[00m\]"
TITLE="\[\e]0;\u: \w\a\]"

PS1="${TITLE}\n${GRAY}┌──[${RESET} \$(prompt_mem)\$(prompt_disk)\$(prompt_temp)\$(prompt_power_supply)\$(prompt_git)\$(prompt_host) ${GRAY}]${RESET}\n${GRAY}└──>${RESET} ${GREEN}\u${RESET}: ${BLUE}\w${RESET} \$ "